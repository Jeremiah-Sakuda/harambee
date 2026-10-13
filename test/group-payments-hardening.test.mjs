import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/paypal-fixture.mjs";

// Counts refund writes per capture; PayPal-Request-Id makes a replayed key idempotent.
const trackRefunds = (f, fail) => {
  const real = f.client.refund;
  const byKey = new Map(),
    calls = [];
  f.client.refund = async (id, key) => {
    calls.push({ id, key });
    const error = fail(id, calls.filter((c) => c.id === id).length);
    if (error) throw error;
    if (!byKey.has(key)) byKey.set(key, await real(id, key));
    return byKey.get(key);
  };
  return {
    calls,
    keysFor: (id) =>
      new Set(calls.filter((c) => c.id === id).map((c) => c.key)),
    writesFor: (id) =>
      [...f.refunds.values()].filter((r) => r.id.startsWith(`R${id}-`)).length,
  };
};

test("a refund replay answered 'in progress' stays unknown, then settles with one refund write per capture", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  await assert.rejects(
    f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
  );
  const first = f.e.state.payments[0].captureId;
  const r = trackRefunds(f, (id, attempt) =>
    id !== first
      ? null
      : attempt === 1
        ? Error("timeout")
        : attempt === 2
          ? Object.assign(Error("in progress"), {
              status: 422,
              details: { details: [{ issue: "PREVIOUS_REQUEST_IN_PROGRESS" }] },
            })
          : null,
  );
  await f.g.recover("organizer");
  await f.g.recover("organizer");
  assert.equal(f.e.state.payments[0].status, "refund_unknown");
  await f.g.recover("organizer");
  assert.equal(f.e.state.status, "cancelled");
  assert.ok(f.e.state.payments.every((p) => p.status === "refunded"));
  for (const p of f.e.state.payments) {
    assert.equal(r.writesFor(p.captureId), 1, "one refund write per capture");
    assert.equal(r.keysFor(p.captureId).size, 1, "one request ID per capture");
  }
});

test("a refund replay PayPal definitively rejects is settled by a deliberate retry, not wedged", async () => {
  const f = fixture();
  for (const p of f.e.active) await f.approve(p.id);
  await assert.rejects(
    f.g.book("organizer", { version: 1, fault: "reservation_failure" }),
  );
  const first = f.e.state.payments[0].captureId;
  const r = trackRefunds(f, (id, attempt) =>
    id !== first
      ? null
      : attempt === 1
        ? Error("timeout")
        : attempt === 2
          ? Object.assign(Error("rejected"), {
              status: 422,
              details: { details: [{ issue: "UNPROCESSABLE_ENTITY" }] },
            })
          : null,
  );
  await f.g.recover("organizer");
  await f.g.recover("organizer");
  // PayPal's records show the capture still completed with no refund on it.
  await f.g.recover("organizer");
  const p = f.e.state.payments[0];
  assert.equal(p.status, "refund_failed");
  assert.equal(r.writesFor(first), 0);
  assert.equal(r.calls.filter((c) => c.id === first).length, 2);
  await f.g.recover("organizer", { retryRefunds: true });
  assert.equal(f.e.state.status, "cancelled");
  assert.equal(p.status, "refunded");
  assert.equal(r.writesFor(first), 1);
  assert.equal(r.keysFor(first).size, 2, "the retry used a new request ID");
});

test("reconciling a settled payment with no provider session never creates a PayPal order", async () => {
  const f = fixture();
  let orders = 0;
  const create = f.client.createOrder;
  f.client.createOrder = async (...args) => {
    orders++;
    return create(...args);
  };
  // An approval interrupted before its provider session was saved.
  const p = {
    id: "interrupted",
    participantId: "maya",
    version: 1,
    amount: 20000,
    status: "created",
    sandboxSessionId: "never-created",
  };
  f.e.state.payments.push(p);
  f.e.persist();
  await f.g.lifecycle.release(p);
  assert.equal(p.status, "abandoned");
  await f.g.reconcile("maya", p.id);
  await f.g.reconcile("organizer", p.id);
  assert.equal(orders, 0);
  assert.equal(p.status, "abandoned");
  assert.equal(f.lab.state.sessions.length, 0);
});

test("a created checkout whose plan moved on is not resumed by reconcile", async () => {
  const f = fixture();
  let orders = 0;
  const create = f.client.createOrder;
  f.client.createOrder = async (...args) => {
    orders++;
    return create(...args);
  };
  const p = {
    id: "stale",
    participantId: "maya",
    version: 0,
    amount: 20000,
    status: "created",
    sandboxSessionId: "never-created",
  };
  f.e.state.payments.push(p);
  await f.g.reconcile("maya", p.id);
  assert.equal(orders, 0);
  // The same record on the current version is still resumable.
  p.version = f.e.state.version;
  await f.g.reconcile("maya", p.id);
  assert.equal(orders, 1);
  assert.equal(p.status, "approval_required");
});
