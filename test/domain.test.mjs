import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Engine, allocate } from "../server/domain.mjs";
import { Store } from "../server/store.mjs";
const fixture = () => {
  let value;
  const store = {
    load: () => value,
    save: (s) => {
      value = structuredClone(s);
    },
  };
  return { engine: new Engine(store), store };
};
const approveAll = (e) =>
  e.active.forEach((p) => e.approve(p.id, e.state.version));
test("allocator conserves cents with caps and stable roster rounding", () => {
  assert.deepEqual(
    allocate(60000, [
      { id: "a", budget: 17000 },
      { id: "b", budget: 22000 },
      { id: "c", budget: 22000 },
    ]),
    [
      { id: "a", share: 17000 },
      { id: "b", share: 21500 },
      { id: "c", share: 21500 },
    ],
  );
  assert.deepEqual(
    allocate(100, [
      { id: "a", budget: null },
      { id: "b", budget: null },
      { id: "c", budget: null },
    ]).map((p) => p.share),
    [34, 33, 33],
  );
  assert.throws(
    () =>
      allocate(601, [
        { id: "a", budget: 300 },
        { id: "b", budget: 300 },
      ]),
    /cannot cover/,
  );
});
test("unapproved people cannot be captured and roles are enforced", () => {
  const { engine: e } = fixture();
  assert.throws(() => e.book("organizer", { version: 1 }), /Every participant/);
  assert.throws(() => e.approve("organizer", 1), /identity/);
  assert.throws(() => e.budget("organizer", 22000), /Only participants/);
  assert.throws(() => e.withdraw("maya", "alex"), /only withdraw/);
  assert.throws(() => e.revise("maya"), /Only the organizer/);
});
test("withdrawal invalidates version, demands new consent and authorizes only top-ups", () => {
  const { engine: e } = fixture();
  approveAll(e);
  e.withdraw("organizer", "sam");
  assert.equal(e.state.status, "revision_required");
  assert.equal(
    e.state.payments.find((p) => p.participantId === "sam").status,
    "voided",
  );
  assert.throws(() => e.approve("maya", 1), /Publish a revised/);
  e.revise("organizer");
  assert.equal(e.state.version, 2);
  assert.throws(() => e.approve("maya", 1), /changed/);
  assert.throws(() => e.book("organizer", { version: 2 }), /Every participant/);
  approveAll(e);
  assert.equal(e.state.status, "ready");
  assert.equal(e.state.payments.filter((p) => p.version === 2).length, 3);
  assert.ok(
    e.state.payments
      .filter((p) => p.version === 2)
      .every((p) => p.amount === 5000),
  );
  e.book("organizer", { version: 2 });
  assert.equal(e.state.status, "confirmed");
  assert.equal(
    e.state.payments
      .filter((p) => p.status === "captured")
      .reduce((a, p) => a + p.amount, 0),
    60000,
  );
});
test("duplicates do not repeat authorization or capture", () => {
  const { engine: e } = fixture();
  approveAll(e);
  const before = e.state.operations.length;
  e.approve("maya", 1);
  assert.equal(e.state.operations.length, before);
  e.book("organizer", { version: 1 });
  const after = e.state.operations.length;
  e.book("organizer", { version: 1 });
  assert.equal(e.state.operations.length, after);
});
for (const fault of [
  "capture_failure",
  "capture_timeout",
  "reservation_failure",
  "refund_pending",
  "lease_expiry",
])
  test(`${fault} recovers after restart without duplicate money movement`, () => {
    const { engine: e, store } = fixture();
    approveAll(e);
    e.book("organizer", { version: 1, fault });
    assert.equal(e.state.status, "recovery_pending");
    const restarted = new Engine(store);
    restarted.recover("organizer");
    if (fault === "refund_pending") {
      assert.equal(restarted.state.status, "recovery_pending");
      restarted.recover("organizer");
    }
    assert.equal(restarted.state.status, "cancelled");
    assert.ok(
      restarted.state.payments.every((p) =>
        ["voided", "refunded"].includes(p.status),
      ),
    );
    assert.equal(
      new Set(restarted.state.operations.map((o) => o.key)).size,
      restarted.state.operations.length,
    );
    const n = restarted.state.operations.length;
    restarted.recover("organizer");
    assert.equal(restarted.state.operations.length, n);
  });
test("unknown reservation commit reconciles to confirmed without duplicate captures", () => {
  const { engine: e } = fixture();
  approveAll(e);
  e.book("organizer", { version: 1, fault: "commit_timeout" });
  const captures = e.state.operations.filter(
    (o) => o.type === "capture",
  ).length;
  e.recover("organizer");
  assert.equal(e.state.status, "confirmed");
  assert.equal(
    e.state.operations.filter((o) => o.type === "capture").length,
    captures,
  );
});
test("changing cabin voids old holds and requires fresh version approval", () => {
  const { engine: e } = fixture();
  approveAll(e);
  e.revise("organizer", { listingId: "creek" });
  assert.ok(e.state.payments.every((p) => p.status === "voided"));
  assert.equal(e.state.current, undefined);
  assert.equal(e.current.total, 48000);
  assert.equal(e.state.status, "collecting");
  approveAll(e);
  e.book("organizer", { version: 2 });
  assert.equal(e.state.status, "confirmed");
});
test("expiry closes collection, voids holds and prevents late approvals", () => {
  const { engine: e } = fixture();
  e.approve("maya", 1);
  e.expire("organizer");
  assert.equal(e.state.payments[0].status, "voided");
  assert.throws(() => e.approve("jordan", 1), /no longer open/);
});
test("private ceilings are absent from other identities including organizer", () => {
  const { engine: e } = fixture();
  assert.equal(e.view("organizer").participants[0].budget, undefined);
  assert.equal(e.view("maya").participants[0].budget, 22000);
  assert.equal(e.view("maya").participants[1].budget, undefined);
});
test("file store survives process-level engine recreation", () => {
  const dir = mkdtempSync(join(tmpdir(), "harambee-test-"));
  try {
    const path = join(dir, "state.json");
    const e = new Engine(new Store(path));
    e.approve("maya", 1);
    const restarted = new Engine(new Store(path));
    assert.equal(restarted.held("maya"), 15000);
    assert.equal(restarted.approved("maya"), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("deadline sweep automatically voids holds before rejecting late approval", () => {
  const { engine: e } = fixture();
  e.approve("maya", 1);
  e.state.deadline = new Date(Date.now() - 1000).toISOString();
  assert.throws(() => e.approve("jordan", 1), /no longer open/);
  assert.equal(e.state.status, "cancelled");
  assert.equal(e.state.payments[0].status, "voided");
});
test("a listing with insufficient guest capacity is rejected", () => {
  const { engine: e } = fixture();
  for (let i = 0; i < 4; i++)
    e.state.participants.push({
      id: `extra${i}`,
      name: "Extra",
      budget: 22000,
      active: true,
    });
  assert.throws(
    () => e.revise("organizer", { listingId: "creek" }),
    /cannot fit/,
  );
});
test("a fully approved old roster cannot book after withdrawal until revision", () => {
  const { engine: e } = fixture();
  approveAll(e);
  e.withdraw("organizer", "sam");
  assert.throws(() => e.book("organizer", { version: 1 }), /Every participant/);
  assert.equal(
    e.state.operations.filter((o) => o.type === "capture").length,
    0,
  );
});
test("lowering a confirmed ceiling blocks booking until fresh allocation and consent", () => {
  const { engine: e } = fixture();
  approveAll(e);
  e.budget("maya", 10000);
  assert.equal(e.state.status, "revision_required");
  assert.throws(() => e.book("organizer", { version: 1 }), /Every participant/);
  e.revise("organizer");
  assert.equal(e.current.shares.find((s) => s.id === "maya").share, 10000);
  assert.equal(e.state.status, "collecting");
});

test("every persisted cancelling/void boundary replays to a confirmed terminal state", () => {
  let disk;
  const snapshots = [];
  const store = {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
      snapshots.push(structuredClone(s));
    },
  };
  const engine = new Engine(store);
  engine.approve("maya", 1);
  engine.expire("organizer");
  const interrupted = snapshots.filter((s) => s.status === "cancelling");
  assert.ok(interrupted.some((s) => s.payments[0].status === "void_pending"));
  for (const snapshot of interrupted) {
    disk = snapshot;
    const restarted = new Engine(store);
    restarted.recover("organizer");
    assert.equal(restarted.state.status, "cancelled");
    assert.equal(restarted.state.payments[0].status, "voided");
    assert.ok(
      restarted.state.operations.every((o) => o.status === "confirmed"),
    );
  }
});
