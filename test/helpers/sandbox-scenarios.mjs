import assert from "node:assert/strict";
import { Engine } from "../../server/domain.mjs";
import { SandboxLab } from "../../server/sandbox-lab.mjs";
import { GroupPayments } from "../../server/group-payments.mjs";
import { fixture } from "./paypal-fixture.mjs";

// Exercises the actual coordinator against synthetic resource transitions.
// Request attempts and successful unique writes are tracked separately.
function setup() {
  const f = fixture();
  f.calls = [];
  f.writes = [];
  for (const action of [
    "createOrder",
    "authorize",
    "capture",
    "void",
    "refund",
  ]) {
    const method = f.client[action];
    const responses = new Map();
    f.client[action] = async (...args) => {
      const key = args[1];
      assert.ok(key, `${action} must have a request ID`);
      f.calls.push({ action, resource: args[0], key });
      if (responses.has(key)) return responses.get(key);
      const result = await method(...args);
      responses.set(key, result);
      f.writes.push({ action, resource: args[0], key });
      return result;
    };
  }
  return f;
}
async function approveAll(f) {
  for (const person of f.e.active) await f.approve(person.id);
}
function restart(f) {
  f.e = new Engine(f.store);
  f.lab = new SandboxLab(f.labStore, f.client);
  f.g = new GroupPayments(f.e, f.lab);
}
const count = (f, action) => f.writes.filter((c) => c.action === action).length;
function result(f, extra = {}) {
  return {
    trip: f.e.state.status,
    payments: f.e.state.payments.map((p) => p.status),
    operations: f.lab.state.sessions.flatMap((s) =>
      s.operations.map((o) => ({ type: o.type, status: o.status })),
    ),
    uniqueWrites: Object.fromEntries(
      ["createOrder", "authorize", "capture", "void", "refund"].map((a) => [
        a,
        count(f, a),
      ]),
    ),
    ...extra,
  };
}
const settled = (r) => {
  assert.equal(r.trip, "cancelled");
  assert.ok(
    r.payments.every((s) => ["voided", "refunded", "abandoned"].includes(s)),
  );
};
const httpFailure = () =>
  Object.assign(Error("Synthetic provider unavailable"), { status: 503 });

export const scenarios = [
  {
    id: "duplicate-book",
    title: "Repeated booking after confirmation does not capture twice",
    async run() {
      const f = setup();
      await approveAll(f);
      await f.g.book("organizer", { version: 1 });
      restart(f);
      await f.g.book("organizer", { version: 1 });
      return result(f);
    },
    verify(r) {
      assert.equal(r.trip, "confirmed");
      assert.equal(r.uniqueWrites.capture, 3);
      assert.equal(r.uniqueWrites.refund, 0);
    },
  },
  {
    id: "deadline-release",
    title: "Expiring a funded trip releases every hold without capture",
    async run() {
      const f = setup();
      await approveAll(f);
      restart(f);
      await f.g.expire("organizer");
      return result(f);
    },
    verify(r) {
      settled(r);
      assert.equal(r.uniqueWrites.void, 3);
      assert.equal(r.uniqueWrites.capture, 0);
    },
  },
  {
    id: "expired-authorization",
    title: "An expired authorization removes readiness and prevents capture",
    async run() {
      const f = setup();
      await approveAll(f);
      const first = f.e.state.payments[0];
      f.auths.get(first.providerId).status = "EXPIRED";
      restart(f);
      await f.g.reconcile("maya", first.id);
      await assert.rejects(
        f.g.book("organizer", { version: 1 }),
        /Every participant/,
      );
      return result(f);
    },
    verify(r) {
      assert.equal(r.trip, "collecting");
      assert.equal(r.payments[0], "voided");
      assert.equal(r.uniqueWrites.capture, 0);
    },
  },
  {
    id: "pending-authorization",
    title:
      "Pending buyer authorization cannot fund booking; CREATED later restores readiness",
    async run() {
      const f = setup();
      const authorize = f.client.authorize;
      f.client.authorize = async (...args) => {
        const order = await authorize(...args);
        order.purchase_units[0].payments.authorizations[0].status = "PENDING";
        return order;
      };
      await approveAll(f);
      const pending = f.e.state.payments.map((p) => p.status);
      await assert.rejects(
        f.g.book("organizer", { version: 1 }),
        /Every participant/,
      );
      for (const a of f.auths.values()) a.status = "CREATED";
      restart(f);
      for (const p of f.e.state.payments)
        await f.g.reconcile(p.participantId, p.id);
      await f.g.book("organizer", { version: 1 });
      return result(f, { pending });
    },
    verify(r) {
      assert.ok(r.pending.every((p) => p === "authorization_pending"));
      assert.equal(r.trip, "confirmed");
      assert.equal(r.uniqueWrites.authorize, 3);
      assert.equal(r.uniqueWrites.capture, 3);
    },
  },
  {
    id: "capture-currency-mismatch",
    title: "Mismatched capture currency stays unverified during reconciliation",
    knownGap:
      "Legacy October 8 finding: reconciliation copied CAPTURED authorization status before rejecting the capture. Passes when the capture is verified first.",
    failureMarker: "Unverified capture must remain unknown",
    async run({ currency = "EUR", value } = {}) {
      const f = setup();
      await approveAll(f);
      const capture = f.client.capture;
      f.client.capture = async (...args) => {
        const c = await capture(...args);
        c.amount = {
          ...c.amount,
          currency_code: currency,
          ...(value ? { value } : {}),
        };
        return c;
      };
      await assert.rejects(
        f.g.book("organizer", { version: 1 }),
        /amount or currency/,
      );
      restart(f);
      await f.g.recover("organizer");
      await f.g.recover("organizer");
      return result(f);
    },
    verify(r) {
      assert.equal(r.trip, "recovery_pending");
      assert.equal(r.uniqueWrites.capture, 1);
      assert.equal(r.uniqueWrites.refund, 0);
      assert.ok(
        r.operations.some(
          (o) => o.type === "capture" && o.status === "unknown",
        ),
      );
      assert.equal(
        r.payments[0],
        "capture_unknown",
        "Unverified capture must remain unknown",
      );
    },
  },
  {
    id: "pending-capture-completes",
    title:
      "Pending capture stops collection; later completion refunds once on recovery",
    async run() {
      const f = setup();
      await approveAll(f);
      const capture = f.client.capture;
      f.client.capture = async (...args) => {
        const c = await capture(...args);
        c.status = "PENDING";
        return c;
      };
      await assert.rejects(
        f.g.book("organizer", { version: 1 }),
        /not confirmed/,
      );
      restart(f);
      await f.g.recover("organizer");
      const pending = result(f);
      for (const c of f.caps.values()) c.status = "COMPLETED";
      restart(f);
      await f.g.recover("organizer");
      return result(f, { pending });
    },
    verify(r) {
      assert.equal(r.pending.trip, "recovery_pending");
      assert.equal(r.pending.payments[0], "capture_pending");
      assert.equal(r.pending.uniqueWrites.refund, 0);
      settled(r);
      assert.equal(r.uniqueWrites.capture, 1);
      assert.equal(r.uniqueWrites.refund, 1);
      assert.equal(r.uniqueWrites.void, 2);
    },
  },
  {
    id: "lost-refund-after-effect",
    title:
      "Lost refund response after execution reconciles without another refund",
    async run() {
      const f = setup();
      await approveAll(f);
      await assert.rejects(
        f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
      );
      const refund = f.client.refund;
      f.client.refund = async (...args) => {
        await refund(...args);
        throw Error("Synthetic response lost after refund");
      };
      await f.g.recover("organizer");
      const uncertain = result(f);
      restart(f);
      await f.g.recover("organizer");
      return result(f, { uncertain });
    },
    verify(r) {
      assert.ok(r.uncertain.payments.every((s) => s === "refund_unknown"));
      settled(r);
      assert.equal(r.uniqueWrites.refund, 3);
    },
  },
  {
    id: "lost-refund-before-effect",
    title: "Refund timeout before execution replays its original request ID",
    async run() {
      const f = setup();
      await approveAll(f);
      await assert.rejects(
        f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
      );
      const refund = f.client.refund;
      const failed = new Set(),
        attempts = [];
      f.client.refund = async (id, key) => {
        attempts.push({ id, requestId: key });
        if (!failed.has(id)) {
          failed.add(id);
          throw Error("Synthetic timeout before refund");
        }
        return refund(id, key);
      };
      await f.g.recover("organizer");
      restart(f);
      await f.g.recover("organizer");
      return result(f, { attempts });
    },
    verify(r) {
      settled(r);
      assert.equal(r.attempts.length, 6);
      for (const id of new Set(r.attempts.map((a) => a.id)))
        assert.equal(
          new Set(r.attempts.filter((a) => a.id === id).map((a) => a.requestId))
            .size,
          1,
        );
      assert.equal(r.uniqueWrites.refund, 3);
    },
  },
  {
    id: "lost-void-after-effect",
    title:
      "Lost void response after execution settles across restart without another void",
    async run() {
      const f = setup();
      await approveAll(f);
      const voidPayment = f.client.void;
      f.client.void = async (...args) => {
        await voidPayment(...args);
        throw Error("Synthetic response lost after void");
      };
      await f.g.cancel("organizer");
      const uncertain = result(f);
      restart(f);
      await f.g.recover("organizer");
      return result(f, { uncertain });
    },
    verify(r) {
      assert.ok(r.uncertain.payments.every((s) => s === "void_unknown"));
      settled(r);
      assert.equal(r.uniqueWrites.void, 3);
      assert.equal(r.uniqueWrites.capture, 0);
    },
  },
  {
    id: "transient-reconcile-error",
    title:
      "Read-side provider outage keeps recovery open and later settles without another capture",
    async run() {
      const f = setup();
      await approveAll(f);
      const capture = f.client.capture;
      f.client.capture = async (...args) => {
        await capture(...args);
        throw Error("Synthetic capture response lost");
      };
      await assert.rejects(f.g.book("organizer", { version: 1 }));
      const getCapture = f.client.getCapture;
      f.client.getCapture = async () => {
        throw httpFailure();
      };
      restart(f);
      await f.g.recover("organizer");
      const unavailable = result(f);
      f.client.getCapture = getCapture;
      restart(f);
      await f.g.recover("organizer");
      return result(f, { unavailable });
    },
    verify(r) {
      assert.equal(r.unavailable.trip, "recovery_pending");
      assert.equal(r.unavailable.uniqueWrites.refund, 0);
      settled(r);
      assert.equal(r.uniqueWrites.capture, 1);
      assert.equal(r.uniqueWrites.refund, 1);
    },
  },
  {
    id: "refund-save-boundary",
    title:
      "Refund persisted before coordinator save is recovered without a duplicate write",
    async run() {
      const f = setup();
      await approveAll(f);
      await assert.rejects(
        f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
      );
      await f.lab.run("refund", { id: f.e.state.payments[0].sandboxSessionId });
      assert.equal(f.e.state.payments[0].status, "captured");
      restart(f);
      await f.g.recover("organizer");
      return result(f);
    },
    verify(r) {
      settled(r);
      assert.equal(r.uniqueWrites.refund, 3);
      assert.equal(r.operations.filter((o) => o.type === "refund").length, 3);
    },
  },
  {
    id: "cancel-unapproved-checkout",
    title:
      "Cancel closes an unapproved checkout and rejects a late buyer callback",
    async run() {
      const f = setup();
      await f.g.approve("maya", 1);
      const first = f.e.state.payments[0];
      await f.g.cancel("organizer");
      restart(f);
      await assert.rejects(
        f.g.complete("maya", { paymentId: first.id, version: 1 }),
      );
      return result(f);
    },
    verify(r) {
      settled(r);
      assert.deepEqual(r.payments, ["abandoned"]);
      assert.equal(r.uniqueWrites.authorize, 0);
      assert.equal(r.uniqueWrites.capture, 0);
    },
  },
  {
    id: "terminal-declined-capture",
    title:
      "Terminal DECLINED capture releases its unused hold without retrying capture",
    knownGap:
      "Legacy October 7 panel finding: declined capture remains pending. Passes when the terminal-state fix is present.",
    failureMarker: "Declined capture must release its hold",
    async run() {
      const f = setup();
      await approveAll(f);
      f.client.capture = async (id) => {
        const c = {
          id: `DECLINED-${id}`,
          status: "DECLINED",
          amount: f.auths.get(id).amount,
        };
        f.caps.set(c.id, c);
        f.orders.get(id.slice(1)).purchase_units[0].payments.captures = [c];
        return c;
      };
      await assert.rejects(f.g.book("organizer", { version: 1 }));
      for (let pass = 0; pass < 3; pass++) {
        restart(f);
        if (f.e.state.status === "recovery_pending")
          await f.g.recover("organizer");
      }
      return result(f);
    },
    verify(r) {
      assert.equal(
        r.trip,
        "cancelled",
        "Declined capture must release its hold",
      );
      settled(r);
      assert.equal(r.uniqueWrites.void, 3);
    },
  },
  {
    id: "terminal-failed-refund",
    title:
      "Terminal FAILED refund shows its reason without retrying automatically",
    knownGap:
      "Legacy October 7 panel finding: failed refund remains pending. Passes when terminal failure is classified and explained.",
    failureMarker: "Terminal refund failures must not be labeled pending",
    async run({ retry = false } = {}) {
      const f = setup();
      await approveAll(f);
      await assert.rejects(
        f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
      );
      const refund = f.client.refund;
      f.client.refund = async (...args) => {
        const r = await refund(...args);
        f.caps.get(args[0]).status = "COMPLETED";
        r.status = "PENDING";
        return r;
      };
      await f.g.recover("organizer");
      for (const r of f.refunds.values()) r.status = "FAILED";
      for (let pass = 0; pass < 3; pass++) {
        restart(f);
        await f.g.recover("organizer");
      }
      const beforeRetry = result(f, {
        guidance: f.e.state.payments.map(
          (p) => p.providerIssue || p.investigation || p.recoveryError,
        ),
      });
      if (!retry) return beforeRetry;
      f.client.refund = refund;
      await f.g.recover("organizer", { retryRefunds: true });
      return result(f, {
        beforeRetry,
        refundKeys: f.calls
          .filter((c) => c.action === "refund")
          .map((c) => c.key),
      });
    },
    verify(r) {
      assert.equal(r.trip, "recovery_pending");
      assert.equal(
        r.uniqueWrites.refund,
        3,
        "Do not automatically replace a failed refund",
      );
      assert.ok(
        r.payments.every((s) => s === "refund_failed"),
        "Terminal refund failures must not be labeled pending",
      );
      assert.ok(
        r.guidance.every(Boolean),
        "Each terminal failure needs explicit resolution guidance",
      );
    },
  },
];

const mismatch = scenarios.find((s) => s.id === "capture-currency-mismatch");
scenarios.push({
  ...mismatch,
  id: "capture-amount-mismatch",
  title: "Wrong USD capture amount stays unverified during reconciliation",
  run: () => mismatch.run({ currency: "USD", value: "199.99" }),
});
const failedRefund = scenarios.find((s) => s.id === "terminal-failed-refund");
scenarios.push({
  id: "deliberate-failed-refund-retry",
  title:
    "Only deliberate retry of a confirmed failed refund creates a fresh request ID",
  knownGap: failedRefund.knownGap,
  failureMarker: failedRefund.failureMarker,
  run: () => failedRefund.run({ retry: true }),
  verify(r) {
    failedRefund.verify(r.beforeRetry);
    settled(r);
    assert.equal(r.uniqueWrites.capture, 3);
    assert.equal(r.uniqueWrites.refund, 6);
    assert.equal(new Set(r.refundKeys).size, 6);
  },
});
