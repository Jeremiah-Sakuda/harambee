import test from "node:test";
import assert from "node:assert/strict";
import { Engine, allocate } from "../server/domain.mjs";
import { SandboxLab } from "../server/sandbox-lab.mjs";
import { GroupPayments } from "../server/group-payments.mjs";
const memory = () => {
  let disk;
  return {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  };
};
function fixture() {
  const store = memory(),
    labStore = memory(),
    orders = new Map(),
    auths = new Map(),
    caps = new Map(),
    refunds = new Map();
  let n = 0;
  const amount = (n) => ({ currency_code: "USD", value: (n / 100).toFixed(2) });
  const client = {
    createOrder: async (cents, key) => {
      const o = {
        id: `O${++n}`,
        cents,
        key,
        status: "APPROVED",
        payer: { payer_id: `BUYER${n}` },
        purchase_units: [],
      };
      orders.set(o.id, o);
      return {
        ...o,
        links: [
          {
            rel: "approve",
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${o.id}`,
          },
        ],
      };
    },
    authorize: async (id) => {
      const o = orders.get(id),
        a = { id: `A${id}`, status: "CREATED", amount: amount(o.cents) };
      auths.set(a.id, a);
      o.purchase_units = [{ payments: { authorizations: [a] } }];
      return o;
    },
    capture: async (id) => {
      const a = auths.get(id);
      a.status = "CAPTURED";
      const c = { id: `C${id}`, status: "COMPLETED", amount: a.amount };
      caps.set(c.id, c);
      orders.get(id.slice(1)).purchase_units[0].payments.captures = [c];
      return c;
    },
    void: async (id) => {
      auths.get(id).status = "VOIDED";
      return {};
    },
    refund: async (id) => {
      const c = caps.get(id);
      c.status = "REFUNDED";
      const r = { id: `R${id}`, status: "COMPLETED", amount: c.amount };
      refunds.set(r.id, r);
      return r;
    },
    getOrder: async (id) => orders.get(id),
    getAuthorization: async (id) => auths.get(id),
    getCapture: async (id) => caps.get(id),
    getRefund: async (id) => refunds.get(id),
  };
  const e = new Engine(store);
  e.state.provider = "paypal-sandbox";
  e.state.participants = e.state.participants.slice(0, 3);
  e.state.participants.forEach((p) => (p.budget = 35000));
  e.current.shares = allocate(60000, e.active);
  e.persist();
  const lab = new SandboxLab(labStore, client),
    g = new GroupPayments(e, lab);
  const approve = async (actor) => {
    await g.approve(actor, e.state.version);
    const p = e.state.payments.at(-1);
    await g.complete(actor, { paymentId: p.id, version: e.state.version });
    return p;
  };
  return { e, g, lab, store, labStore, client, approve, orders, auths, caps };
}
test("three independent sandbox buyers: dropout, exact revised topups, capture and fixture booking", async () => {
  const { e, g, approve } = fixture();
  for (const p of e.active) await approve(p.id);
  assert.equal(e.state.status, "ready");
  assert.equal(
    e.state.payments.reduce((n, p) => n + p.amount, 0),
    60000,
  );
  await g.withdraw("jordan", "jordan");
  await g.revise("organizer", {});
  await assert.rejects(
    g.book("organizer", { version: 2 }),
    /Every participant/,
  );
  for (const p of e.active) {
    const payment = await approve(p.id);
    assert.equal(payment.amount, 10000);
  }
  assert.equal(e.ready(), true);
  await g.book("organizer", { version: 2 });
  assert.equal(e.state.status, "confirmed");
  assert.equal(
    e.state.payments
      .filter((p) => p.status === "captured")
      .reduce((n, p) => n + p.amount, 0),
    60000,
  );
  assert.equal(
    e.state.payments.find((p) => p.participantId === "jordan").status,
    "voided",
  );
});
test("sandbox partial capture survives restart then refunds and releases remaining holds", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const capture = f.client.capture;
  let calls = 0;
  f.client.capture = async (id) => {
    if (++calls === 2) throw Object.assign(Error("declined"), { status: 422 });
    return capture(id);
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }));
  assert.equal(f.e.state.status, "recovery_pending");
  const e = new Engine(f.store),
    lab = new SandboxLab(f.labStore, f.client),
    g = new GroupPayments(e, lab);
  await g.recover("organizer");
  assert.equal(e.state.status, "cancelled");
  assert.deepEqual(
    e.state.payments.map((p) => p.status),
    ["refunded", "voided", "voided"],
  );
  assert.equal(calls, 2);
});
test("unknown sandbox capture never triggers a replacement or premature recovery completion", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  let calls = 0;
  f.client.capture = async () => {
    calls++;
    throw Error("timeout");
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }));
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "recovery_pending");
  assert.equal(f.e.state.payments[0].status, "capture_unknown");
  assert.equal(calls, 1);
});
test("stale checkout and duplicate buyer cannot satisfy current group consent", async () => {
  const f = fixture();
  await f.g.approve("maya", 1);
  const p = f.e.state.payments[0];
  await assert.rejects(
    f.g.complete("jordan", { paymentId: p.id, version: 1 }),
    /Only/,
  );
  await f.g.withdraw("jordan", "jordan");
  await f.g.revise("organizer", {});
  await assert.rejects(
    f.g.complete("maya", { paymentId: p.id, version: 1 }),
    /stale/,
  );
  assert.equal(p.status, "abandoned");
});
test("fixture commit failure refunds all PayPal captures with persisted IDs", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  await assert.rejects(
    f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
  );
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.ok(
    f.e.state.payments.every((p) => p.status === "refunded" && p.refundId),
  );
});

test("same sandbox buyer across different participants blocks readiness", async () => {
  const f = fixture();
  const first = await f.approve("maya");
  await f.g.approve("jordan", 1);
  const second = f.e.state.payments.at(-1);
  const order = f.orders.get(
    f.lab.state.sessions.find((s) => s.id === second.sandboxSessionId).orderId,
  );
  order.payer.payer_id = first.payerId;
  await assert.rejects(
    f.g.complete("jordan", { paymentId: second.id, version: 1 }),
    /distinct/,
  );
  assert.equal(f.e.ready(), false);
  await f.g.expire("organizer");
  assert.equal(f.e.state.status, "cancelled");
});

test("reconciles provider response persisted before coordinator snapshot without duplicate calls", async () => {
  const f = fixture();
  await f.g.approve("maya", 1);
  const p = f.e.state.payments[0];
  await f.lab.run("authorize", { id: p.sandboxSessionId }); // crash before coordinator sync
  const restarted = new Engine(f.store),
    lab = new SandboxLab(f.labStore, f.client),
    g = new GroupPayments(restarted, lab);
  assert.equal(restarted.state.payments[0].status, "approval_required");
  await g.reconcile("maya", p.id);
  assert.equal(restarted.state.payments[0].status, "authorized");
  assert.equal(
    lab.state.sessions[0].operations.filter((o) => o.type === "authorize")
      .length,
    1,
  );
});
