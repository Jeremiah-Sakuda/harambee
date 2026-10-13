import test from "node:test";
import assert from "node:assert/strict";
import {
  paymentSummary,
  organizerRecovery,
  participantCheckouts,
  recoveryMessage,
  recoveryLabel,
} from "../src/payment-summary.mjs";
test("failed refunds retain the captured balance in both group and participant projections", () => {
  const payments = [
    { participantId: "maya", amount: 20000, status: "refund_failed" },
    { participantId: "jordan", amount: 20000, status: "refunded" },
    { participantId: "alex", amount: 20000, status: "refunded" },
  ];
  assert.equal(paymentSummary(payments).captured, 20000);
  assert.equal(paymentSummary(payments).returned, 40000);
  const mine = payments.filter((p) => p.participantId === "maya");
  assert.equal(paymentSummary(mine).captured, 20000);
  assert.match(
    recoveryMessage(mine).text,
    /\$200 is still charged.*organizer needs to retry/,
  );
  assert.match(recoveryLabel(mine), /Refund failed.*\$200 still charged/);
});
test("uncertain capture and hold outcomes never promise no charge or release", () => {
  for (const status of [
    "unknown",
    "capture_unknown",
    "capture_pending",
    "authorization_unknown",
    "authorization_pending",
    "void_unknown",
    "void_pending",
  ]) {
    const payments = [{ amount: 20000, status }];
    const p = paymentSummary(payments);
    assert.equal(p.checkingCapture + p.checkingHold, 20000, status);
    assert.doesNotMatch(
      recoveryMessage(payments).text,
      /won't be charged|nothing.*held|has been returned/i,
      status,
    );
    assert.match(recoveryLabel(payments), /Checking/);
  }
});
test("pending, unconfirmed and completed refunds remain different states", () => {
  for (const status of ["refund_pending", "refund_unknown"]) {
    const payments = [{ amount: 20000, status }];
    assert.equal(paymentSummary(payments).captured, 20000);
    assert.equal(paymentSummary(payments).returned, 0);
    assert.doesNotMatch(
      recoveryMessage(payments).text,
      /has been returned|won't be charged/,
    );
  }
  const settled = [{ amount: 20000, status: "refunded" }];
  assert.equal(paymentSummary(settled).captured, 0);
  assert.match(recoveryMessage(settled).text, /\$200 has been returned/);
});

test("organizer and participant guidance agree across every supported uncertain outcome", () => {
  for (const status of [
    "unknown",
    "capture_unknown",
    "capture_pending",
    "authorization_unknown",
    "authorization_pending",
    "authorize_unknown",
    "void_unknown",
    "void_pending",
    "refund_unknown",
  ]) {
    const state = trip([{ participantId: "maya", amount: 20000, status }]);
    const organizer = organizerRecovery(state);
    assert.match(organizer.text, /still being confirmed with PayPal/, status);
    assert.doesNotMatch(
      organizer.text,
      /nobody was charged|has been returned|nothing remains charged/i,
      status,
    );
    assert.equal(organizer.onlyRefunds, false, status);
    assert.match(recoveryLabel(state.payments), /Checking/, status);
    assert.equal(paymentSummary(state.payments).returned, 0, status);
  }
});
test("mixed captures, pending refunds, failures and holds keep their own recovery meaning", () => {
  const state = trip([
    { participantId: "maya", amount: 10000, status: "captured" },
    { participantId: "maya", amount: 5000, status: "captured" },
    { participantId: "jordan", amount: 20000, status: "refund_failed" },
    { participantId: "alex", amount: 15000, status: "refund_pending" },
    { participantId: "sam", amount: 5000, status: "authorized" },
  ]);
  const organizer = organizerRecovery(state);
  assert.match(organizer.text, /Maya’s \$150 will be returned/);
  assert.match(organizer.text, /Jordan’s refund of \$200 failed/);
  assert.match(organizer.text, /Alex’s \$150 is being returned/);
  assert.match(organizer.text, /Remaining holds will be released/);
  assert.doesNotMatch(organizer.text, /Nobody was charged|Maya and Maya/);
  assert.equal(organizer.refundFailed, true);
  assert.equal(organizer.onlyRefunds, false);
  const balances = paymentSummary(state.payments);
  assert.equal(balances.captured, 50000);
  assert.equal(balances.held, 5000);
});
test("only pending refunds offer status checking; other open outcomes need recovery", () => {
  const payments = [
    { participantId: "maya", amount: 20000, status: "refund_pending" },
    { participantId: "jordan", amount: 20000, status: "refunded" },
    { participantId: "alex", amount: 20000, status: "voided" },
  ];
  assert.equal(organizerRecovery(trip(payments)).onlyRefunds, true);
  assert.equal(
    organizerRecovery(trip(payments)).actionLabel,
    "Check refund status",
  );
  for (const status of [
    "captured",
    "authorized",
    "refund_failed",
    "refund_unknown",
    "capture_unknown",
    "approval_required",
    "created",
  ]) {
    assert.equal(
      organizerRecovery(
        trip([...payments, { participantId: "sam", amount: 1, status }]),
      ).onlyRefunds,
      false,
      status,
    );
  }
  assert.equal(organizerRecovery(trip([])).onlyRefunds, false);
});
test("returned money is described as returned, including alongside remaining holds", () => {
  const refunded = { participantId: "maya", amount: 20000, status: "refunded" };
  for (const extra of [
    [],
    [{ participantId: "jordan", amount: 20000, status: "authorized" }],
  ]) {
    const state = trip([refunded, ...extra]);
    const organizer = organizerRecovery(state);
    assert.match(organizer.text, /Maya’s \$200 has been returned/);
    assert.doesNotMatch(organizer.text, /nobody was charged/i);
    assert.equal(paymentSummary(state.payments).returned, 20000);
    if (!extra.length) {
      assert.match(organizer.text, /Nothing remains charged or held/);
      assert.equal(organizer.actionLabel, "Finish closing the trip");
      assert.match(organizer.guidance, /All payments are settled/);
    } else
      assert.doesNotMatch(organizer.text, /Nothing remains charged or held/);
  }
});
test("stop reasons and provider names survive projection; active trips have no recovery message", () => {
  for (const [reason, text] of [
    ["capture_declined", /Maya’s payment didn’t go through/],
    ["capture_unknown", /PayPal didn’t confirm/],
    ["reservation_failed", /cabin couldn’t be reserved/],
    ["reservation_unknown", /cabin’s reply timed out/],
    ["lease_expired", /cabin hold ran out/],
    ["cancelled", /organizer cancelled/],
    ["expired", /collection deadline passed/],
  ]) {
    const state = trip([
      { participantId: "maya", amount: 20000, status: "capture_unknown" },
    ]);
    state.stop = { reason, participantId: "maya" };
    const organizer = organizerRecovery(state);
    assert.match(organizer.text, text);
    assert.equal(
      organizer.title,
      ["cancelled", "expired"].includes(reason)
        ? "Closing the trip."
        : "Booking stopped.",
    );
  }
  const simulated = trip([
    { participantId: "maya", amount: 20000, status: "refund_failed" },
  ]);
  simulated.provider = "simulated";
  assert.match(organizerRecovery(simulated).text, /payment simulator/);
  assert.doesNotMatch(organizerRecovery(simulated).text, /PayPal/);
  assert.equal(organizerRecovery({ ...simulated, status: "collecting" }), null);
});

function trip(payments) {
  return {
    status: "recovery_pending",
    provider: "paypal-sandbox",
    payments,
    stop: { reason: "reservation_failed" },
    participants: ["Maya", "Jordan", "Alex", "Sam"].map((name) => ({
      id: name.toLowerCase(),
      name,
    })),
  };
}

test("participant checkout actions require the current open plan and never reappear during recovery", () => {
  const state = trip([
    {
      id: "p1",
      participantId: "maya",
      version: 1,
      sandboxSessionId: "s1",
      status: "approval_required",
      amount: 20000,
      approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=fixture",
    },
  ]);
  state.version = 1;
  state.participants.forEach((p) => (p.active = true));
  for (const status of [
    "recovery_pending",
    "booking",
    "confirmed",
    "cancelled",
    "revision_required",
    "cancelling",
  ])
    assert.deepEqual(
      participantCheckouts({ ...state, status }, "maya"),
      [],
      status,
    );
  state.status = "collecting";
  assert.equal(participantCheckouts(state, "maya")[0].canConfirm, true);
  assert.equal(
    participantCheckouts(state, "maya")[0].approvalUrl,
    state.payments[0].approvalUrl,
  );
  assert.deepEqual(participantCheckouts(state, "jordan"), []);
  assert.deepEqual(participantCheckouts({ ...state, version: 2 }, "maya"), []);
  for (const status of [
    "refund_failed",
    "refund_pending",
    "refund_unknown",
    "refunded",
    "captured",
    "authorized",
    "abandoned",
    "voided",
    "capture_unknown",
  ])
    assert.deepEqual(
      participantCheckouts(
        { ...state, payments: [{ ...state.payments[0], status }] },
        "maya",
      ),
      [],
      status,
    );
  state.participants[0].active = false;
  assert.deepEqual(participantCheckouts(state, "maya"), []);
});
test("uncertain checkout creation and authorization offer reconciliation without a fresh approval", () => {
  const state = trip([]);
  state.version = 1;
  state.status = "collecting";
  state.participants[0].active = true;
  for (const status of [
    "created",
    "create_unknown",
    "authorization_unknown",
    "authorization_pending",
    "authorize_unknown",
  ]) {
    state.payments = [
      {
        participantId: "maya",
        version: 1,
        sandboxSessionId: "s1",
        status,
        amount: 20000,
        approvalUrl: "old checkout",
      },
    ];
    const [checkout] = participantCheckouts(state, "maya");
    assert.equal(checkout.canConfirm, false, status);
    assert.equal(checkout.approvalUrl, null, status);
  }
});
