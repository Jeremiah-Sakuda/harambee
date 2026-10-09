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
      const payments = orders.get(id.slice(2))?.purchase_units[0].payments;
      if (payments) payments.refunds = [...(payments.refunds ?? []), r];
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
    /own sandbox buyer/,
  );
  assert.equal(second.status, "voided");
  assert.equal(f.e.ready(), false);
  // Jordan can retry with a different buyer instead of being stuck.
  await f.approve("jordan");
  assert.equal(f.e.held("jordan"), 20000);
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

test("PayPal minimal write responses still verify amounts and complete a booking", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  for (const name of ["capture", "refund"]) {
    const full = f.client[name];
    // PayPal's default Prefer: return=minimal body.
    f.client[name] = async (id) => {
      const r = await full(id);
      return { id: r.id, status: r.status, links: [] };
    };
  }
  await f.g.book("organizer", { version: 1 });
  assert.equal(f.e.state.status, "confirmed");
  assert.ok(f.e.state.payments.every((p) => p.status === "captured"));
});

test("sandbox booking refuses a plan that still requires revision", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  f.e.state.status = "revision_required";
  await assert.rejects(
    f.g.book("organizer", { version: 1 }),
    /Every participant/,
  );
  assert.equal(f.e.state.status, "revision_required");
});

test("out-of-range sandbox share is rejected before any payment is persisted", async () => {
  const f = fixture();
  f.e.state.participants.forEach((p) => (p.budget = 60000));
  f.e.current.shares = [
    { id: "maya", share: 50100 },
    { id: "jordan", share: 9900 },
  ];
  f.e.state.participants[2].active = false;
  await assert.rejects(f.g.approve("maya", 1), /\$500/);
  assert.equal(f.e.state.payments.length, 0);
});

test("a payment with no sandbox session can be released instead of wedging the plan", async () => {
  const f = fixture();
  f.e.state.payments.push({
    id: "orphan",
    participantId: "maya",
    version: 1,
    amount: 20000,
    status: "created",
    sandboxSessionId: "never-created",
  });
  await f.g.withdraw("organizer", "maya");
  assert.equal(f.e.state.payments[0].status, "abandoned");
});

test("order create timeout reconciles by replaying the same PayPal-Request-Id", async () => {
  const f = fixture();
  const create = f.client.createOrder;
  const keys = [];
  let first = true;
  f.client.createOrder = async (cents, key, checkout) => {
    keys.push(key);
    if (first) {
      first = false;
      throw Error("timeout");
    }
    return create(cents, key, checkout);
  };
  await assert.rejects(
    f.g.approve("maya", 1, { appUrl: "http://127.0.0.1:5171" }),
  );
  const p = f.e.state.payments[0];
  assert.equal(p.status, "create_unknown");
  await f.g.reconcile("maya", p.id);
  assert.equal(p.status, "approval_required");
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
});

test("definitely failed create is abandoned and the participant can approve again", async () => {
  const f = fixture();
  const create = f.client.createOrder;
  f.client.createOrder = async () => {
    throw Object.assign(Error("bad request"), {
      status: 422,
      details: { name: "UNPROCESSABLE_ENTITY" },
    });
  };
  await assert.rejects(f.g.approve("maya", 1), /422 \(UNPROCESSABLE_ENTITY\)/);
  assert.equal(f.e.state.payments[0].status, "abandoned");
  f.client.createOrder = create;
  await f.approve("maya");
  assert.equal(f.e.held("maya"), 20000);
});

test("checkout return URLs bring each buyer back to their own participant view", async () => {
  const f = fixture();
  const seen = [];
  const create = f.client.createOrder;
  f.client.createOrder = async (cents, key, checkout) => {
    seen.push(checkout);
    return create(cents, key, checkout);
  };
  await f.g.approve("maya", 1, { appUrl: "http://127.0.0.1:5171" });
  const p = f.e.state.payments[0];
  const back = new URL(seen[0].returnUrl);
  assert.equal(back.origin, "http://127.0.0.1:5171");
  assert.equal(back.searchParams.get("participant"), "maya");
  assert.equal(back.searchParams.get("paypal"), "return");
  assert.equal(back.searchParams.get("payment"), p.id);
  assert.equal(new URL(seen[0].cancelUrl).searchParams.get("paypal"), "cancel");
  assert.match(seen[0].description, /Maya/);
});

test("a stale revision option is rejected before any sandbox hold is released", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  await f.g.withdraw("jordan", "jordan");
  await assert.rejects(
    f.g.revise("organizer", {
      expectedShares: [
        { id: "maya", share: 25000 },
        { id: "alex", share: 35000 },
      ],
    }),
    /changed since this option/,
  );
  assert.equal(f.e.state.version, 1);
  assert.deepEqual(
    f.e.state.payments.map((p) => p.status),
    ["authorized", "voided", "authorized"],
  );
});

// PayPal-Request-Id semantics: a repeated key returns the original result instead of acting twice.
function idempotent(f, name) {
  const real = f.client[name],
    seen = new Map();
  let executed = 0;
  f.client[name] = async (id, key) => {
    if (!seen.has(key)) {
      executed++;
      seen.set(key, await real(id, key));
    }
    return seen.get(key);
  };
  return () => executed;
}
const age = (f, type) =>
  f.lab.state.sessions
    .flatMap((s) => s.operations)
    .filter((o) => o.type === type)
    .forEach((o) => (o.at = new Date(Date.now() - 120000).toISOString()));

test("an authorize timeout is settled by replaying the same request ID, not left stuck", async () => {
  const f = fixture();
  const executed = idempotent(f, "authorize");
  const wrapped = f.client.authorize;
  let lost = true;
  f.client.authorize = async (id, key) => {
    if (lost) {
      lost = false;
      throw Error("timeout before reaching PayPal");
    }
    return wrapped(id, key);
  };
  await f.g.approve("maya", 1);
  const p = f.e.state.payments[0];
  await assert.rejects(f.g.complete("maya", { paymentId: p.id, version: 1 }));
  assert.equal(p.status, "authorize_unknown");
  await f.g.reconcile("maya", p.id);
  assert.equal(p.status, "authorized");
  assert.equal(executed(), 1);
  const ops = f.lab.state.sessions[0].operations.filter(
    (o) => o.type === "authorize",
  );
  assert.equal(ops.length, 1);
  assert.equal(ops[0].status, "confirmed");
});

test("a capture that never reached PayPal is released by recovery instead of holding funds", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  f.client.capture = async () => {
    throw Error("timeout before reaching PayPal");
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }));
  // Too soon to conclude anything: the request might still be in flight.
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "recovery_pending");
  age(f, "capture");
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.deepEqual(
    f.e.state.payments.map((p) => p.status),
    ["voided", "voided", "voided"],
  );
  assert.equal([...f.caps.values()].length, 0);
});

test("a capture whose response was lost is recovered by replay, never charged twice", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const executed = idempotent(f, "capture");
  const wrapped = f.client.capture;
  let lose = true;
  f.client.capture = async (id, key) => {
    const r = await wrapped(id, key);
    if (lose) {
      lose = false;
      throw Error("response lost after PayPal captured");
    }
    return r;
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }));
  await f.g.recover("organizer");
  assert.equal(executed(), 1);
  assert.equal(f.e.state.status, "cancelled");
  assert.deepEqual(
    f.e.state.payments.map((p) => p.status),
    ["refunded", "voided", "voided"],
  );
});

test("a void timeout is settled by replaying the void", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const executed = idempotent(f, "void");
  const wrapped = f.client.void;
  let lost = true;
  f.client.void = async (id, key) => {
    if (lost) {
      lost = false;
      throw Error("timeout");
    }
    return wrapped(id, key);
  };
  await assert.rejects(f.g.withdraw("jordan", "jordan"));
  const jordan = f.e.state.payments.find((p) => p.participantId === "jordan");
  assert.equal(jordan.status, "void_unknown");
  await f.g.withdraw("jordan", "jordan");
  assert.equal(jordan.status, "voided");
  assert.equal(executed(), 1);
});

test("a capture PayPal declines takes nothing, names who, and recovery voids the open hold", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const real = f.client.capture;
  let calls = 0;
  f.client.capture = async (id, key) => {
    calls++;
    if (calls === 2)
      // PayPal answered definitively: declined, nothing taken, the authorization stays open.
      return {
        id: `C${id}`,
        status: "DECLINED",
        status_details: { reason: "DECLINED_BY_RISK_FRAUD_FILTERS" },
        amount: f.auths.get(id).amount,
      };
    return real(id, key);
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }), /declined/);
  const jordan = f.e.state.payments[1];
  assert.equal(jordan.status, "capture_declined");
  assert.match(jordan.providerIssue, /declined the capture.*nothing was taken/);
  assert.deepEqual(f.e.state.stop, {
    reason: "capture_declined",
    participantId: jordan.participantId,
  });
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.deepEqual(
    f.e.state.payments.map((p) => p.status),
    ["refunded", "voided", "voided"],
  );
  assert.equal(calls, 2, "a declined capture is never retried");
});

test("a refund PayPal reports as failed stays visible and is retried only on request", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const real = f.client.refund,
    keys = [];
  f.client.refund = async (id, key) => {
    keys.push(key);
    if (keys.length === 1)
      return {
        id: `RF${id}`,
        status: "FAILED",
        amount: { currency_code: "USD", value: "200.00" },
      };
    return real(id, key);
  };
  await assert.rejects(
    f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
  );
  await f.g.recover("organizer");
  const maya = f.e.state.payments[0];
  assert.equal(maya.status, "refund_failed");
  assert.match(maya.providerIssue, /refund failed.*still captured/);
  assert.equal(f.e.state.status, "recovery_pending");
  // A plain recovery pass and a restart don't retry it behind anyone's back.
  const g2 = new GroupPayments(
    new Engine(f.store),
    new SandboxLab(f.labStore, f.client),
  );
  await g2.recover("organizer");
  assert.equal(g2.s.payments[0].status, "refund_failed");
  assert.equal(keys.length, 3);
  await g2.recover("organizer", { retryRefunds: true });
  assert.equal(g2.s.status, "cancelled");
  assert.equal(g2.s.payments[0].status, "refunded");
  assert.notEqual(keys[3], keys[0], "a deliberate retry uses a new request ID");
});

test("an unapproved order PayPal no longer has is abandoned, so withdraw and cancel proceed", async () => {
  const f = fixture();
  await f.approve("maya");
  await f.approve("jordan");
  await f.g.approve("alex", 1);
  const alex = f.e.state.payments.at(-1);
  const orderId = f.lab.state.sessions.find(
    (s) => s.id === alex.sandboxSessionId,
  ).orderId;
  const real = f.client.getOrder;
  f.client.getOrder = async (id) => {
    if (id === orderId)
      throw Object.assign(Error("RESOURCE_NOT_FOUND"), { status: 404 });
    return real(id);
  };
  await f.g.withdraw("organizer", "alex");
  assert.equal(alex.status, "abandoned");
  assert.match(alex.providerIssue, /expired before the buyer approved/);
  await f.g.cancel("organizer");
  assert.equal(f.e.state.status, "cancelled");
});

test("cancel voids every sandbox hold, closes open checkouts, and a late PayPal return can't authorize", async () => {
  const f = fixture();
  await f.approve("maya");
  await f.approve("jordan");
  await f.g.approve("alex", 1);
  const alex = f.e.state.payments.at(-1);
  await f.g.cancel("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.deepEqual(f.e.state.stop, { reason: "cancelled" });
  assert.deepEqual(
    f.e.state.payments.map((p) => p.status),
    ["voided", "voided", "abandoned"],
  );
  await assert.rejects(
    f.g.complete("alex", { paymentId: alex.id, version: 1 }),
    /no longer open/,
  );
  assert.equal([...f.caps.values()].length, 0);
});

test("a cancel whose void response was lost stays open and settles on the next recovery", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const executed = idempotent(f, "void");
  const wrapped = f.client.void;
  let lost = true;
  f.client.void = async (id, key) => {
    if (lost) {
      lost = false;
      throw Error("timeout");
    }
    return wrapped(id, key);
  };
  await f.g.cancel("organizer");
  assert.equal(f.e.state.status, "recovery_pending");
  assert.equal(f.e.state.stop.reason, "cancelled");
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.equal(executed(), 3);
});

test("a hold settled by reconcile on a reused buyer is voided with the same message", async () => {
  const f = fixture();
  await f.approve("maya");
  const mayaBuyer = f.e.state.payments[0].payerId;
  await f.g.approve("jordan", 1);
  const jordan = f.e.state.payments.at(-1);
  const orderId = f.lab.state.sessions.find(
    (s) => s.id === jordan.sandboxSessionId,
  ).orderId;
  f.orders.get(orderId).payer.payer_id = mayaBuyer;
  const real = f.client.authorize;
  f.client.authorize = async (id, key) => {
    await real(id, key);
    throw Error("response lost");
  };
  await assert.rejects(
    f.g.complete("jordan", { paymentId: jordan.id, version: 1 }),
  );
  await assert.rejects(f.g.reconcile("jordan", jordan.id), /own sandbox buyer/);
  assert.equal(jordan.status, "voided");
});

for (const [name, reported] of [
  ["amount", { currency_code: "USD", value: "199.99" }],
  ["currency", { currency_code: "EUR", value: "200.00" }],
  ["missing amount", null],
]) {
  test(`authorization ${name} mismatch blocks capture across restart until verified`, async () => {
    const f = fixture();
    for (const person of f.e.active) await f.approve(person.id);
    const payment = f.e.state.payments[0];
    f.auths.get(payment.providerId).amount = reported;
    let captures = 0;
    const capture = f.client.capture;
    f.client.capture = (...args) => {
      captures++;
      return capture(...args);
    };
    await assert.rejects(
      f.g.reconcile("organizer", payment.id),
      /amount or currency/,
    );
    assert.equal(payment.status, "authorization_unknown");
    assert.equal(f.e.state.status, "collecting");
    assert.equal(f.e.ready(), false);
    assert.match(payment.investigation, /amount or currency/);
    const restarted = new Engine(f.store);
    const lab = new SandboxLab(f.labStore, f.client);
    const group = new GroupPayments(restarted, lab);
    assert.equal(restarted.state.payments[0].status, "authorization_unknown");
    await assert.rejects(
      group.book("organizer", { version: 1 }),
      /exact current share/,
    );
    assert.equal(captures, 0);
    assert.equal(f.caps.size, 0);
    f.auths.get(payment.providerId).amount = {
      currency_code: "USD",
      value: "200.00",
    };
    await group.reconcile("organizer", payment.id);
    assert.equal(restarted.state.status, "ready");
    assert.equal(restarted.ready(), true);
    assert.equal(restarted.state.payments[0].investigation, null);
    await group.book("organizer", { version: 1 });
    assert.equal(restarted.state.status, "confirmed");
    assert.equal(captures, 3);
  });
}

test("a refund whose response was lost still records its refund ID, read from the order", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  await assert.rejects(
    f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
  );
  const real = f.client.refund;
  f.client.refund = async (...args) => {
    await real(...args);
    throw Error("response lost after PayPal refunded");
  };
  await f.g.recover("organizer");
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.ok(
    f.e.state.payments.every((p) => p.status === "refunded" && p.refundId),
  );
});

test("a capture PayPal rejects outright is reported as that person's payment, not the cabin", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  const real = f.client.capture;
  let calls = 0;
  f.client.capture = async (...args) => {
    if (++calls === 2)
      throw Object.assign(Error("AUTHORIZATION_EXPIRED"), { status: 422 });
    return real(...args);
  };
  await assert.rejects(f.g.book("organizer", { version: 1 }));
  assert.deepEqual(f.e.state.stop, {
    reason: "capture_declined",
    participantId: f.e.state.payments[1].participantId,
  });
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
});
