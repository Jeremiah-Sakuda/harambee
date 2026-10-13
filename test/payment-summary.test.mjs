import test from "node:test";
import assert from "node:assert/strict";
import {
  paymentSummary,
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
