const usd = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
// One vocabulary for balances, participant guidance and organizer recovery.
const outcomeGroup = {
  authorized: "held",
  failed: "held",
  capture_declined: "held",
  captured: "toReturn",
  refunded: "returned",
  refund_pending: "refundPending",
  refund_failed: "refundFailed",
  refund_unknown: "refundUnknown",
  capture_unknown: "checkingCapture",
  capture_pending: "checkingCapture",
  unknown: "checkingCapture",
  authorization_unknown: "checkingHold",
  authorization_pending: "checkingHold",
  authorize_unknown: "checkingHold",
  void_unknown: "checkingHold",
  void_pending: "checkingHold",
  voided: "released",
  abandoned: "released",
};
function classify(payments) {
  const groups = Object.fromEntries(
    [...new Set(Object.values(outcomeGroup)), "other"].map((key) => [key, []]),
  );
  for (const payment of payments)
    groups[outcomeGroup[payment.status] ?? "other"].push(payment);
  return groups;
}
const sum = (payments) => payments.reduce((n, p) => n + p.amount, 0);
export function paymentSummary(payments) {
  const p = classify(payments);
  return {
    held: sum(p.held),
    captured: sum([
      ...p.toReturn,
      ...p.refundPending,
      ...p.refundFailed,
      ...p.refundUnknown,
    ]),
    returned: sum(p.returned),
    refundPending: sum(p.refundPending),
    refundFailed: sum(p.refundFailed),
    refundUnknown: sum(p.refundUnknown),
    checkingCapture: sum(p.checkingCapture),
    checkingHold: sum(p.checkingHold),
  };
}

export function organizerRecovery(state) {
  if (state.status !== "recovery_pending") return null;
  const p = classify(state.payments);
  const provider =
    state.provider === "paypal-sandbox" ? "PayPal" : "the payment simulator";
  const firstOf = (id) =>
    state.participants.find((p) => p.id === id)?.name.split(" ")[0] ??
    "A participant";
  const names = (payments) =>
    new Intl.ListFormat("en", { type: "conjunction" }).format([
      ...new Set(payments.map((p) => firstOf(p.participantId))),
    ]);
  const total = (payments) => usd(sum(payments));
  const stop = state.stop ?? {};
  const who = stop.participantId ? firstOf(stop.participantId) : "One";
  const cause =
    {
      capture_declined: `${who}’s payment didn’t go through.`,
      capture_unknown: `${provider.replace(/^./, (c) => c.toUpperCase())} didn’t confirm one payment in time; Harambee checks with it before doing anything else.`,
      reservation_failed: "The cabin couldn’t be reserved.",
      reservation_unknown:
        "The cabin’s reply timed out; Harambee checks the reservation before deciding.",
      lease_expired:
        "The cabin hold ran out before every payment was confirmed.",
      cancelled: "The organizer cancelled the trip.",
      expired: "The collection deadline passed.",
    }[stop.reason] ?? "Something stopped the booking.";
  const parts = [cause, "Nothing more will be collected."];
  if (p.toReturn.length)
    parts.push(`${names(p.toReturn)}’s ${total(p.toReturn)} will be returned.`);
  if (p.refundPending.length)
    parts.push(
      `${names(p.refundPending)}’s ${total(p.refundPending)} is being returned; ${provider} is still processing it.`,
    );
  if (p.refundFailed.length)
    parts.push(
      `${provider.replace(/^./, (c) => c.toUpperCase())} reports ${names(p.refundFailed)}’s refund of ${total(p.refundFailed)} failed. That money is still captured; nothing was retried automatically.`,
    );
  if (p.returned.length)
    parts.push(
      `${names(p.returned)}’s ${total(p.returned)} has been returned.`,
    );
  const checking = [
    ...p.checkingCapture,
    ...p.checkingHold,
    ...p.refundUnknown,
  ];
  const taken =
    p.toReturn.length ||
    p.refundPending.length ||
    p.refundFailed.length ||
    p.returned.length;
  if (checking.length)
    parts.push(
      `${names(checking)}’s payment is still being confirmed with ${provider}.`,
    );
  // Completed refunds are evidence of a prior charge, not evidence nobody was charged.
  if (p.held.length)
    parts.push(
      taken || checking.length
        ? "Remaining holds will be released, never charged."
        : "Every hold will be released; nobody was charged.",
    );
  else if (!taken && !checking.length) parts.push("Nobody was charged.");
  if (
    p.returned.length &&
    !p.toReturn.length &&
    !p.refundPending.length &&
    !p.refundFailed.length &&
    !checking.length &&
    !p.held.length
  )
    parts.push("Nothing remains charged or held.");
  parts.push("Nobody is charged twice.");
  const settled =
    p.returned.length + p.released.length === state.payments.length;
  const onlyRefunds =
    p.refundPending.length > 0 &&
    p.refundPending.length + p.returned.length + p.released.length ===
      state.payments.length;
  return {
    title: ["cancelled", "expired"].includes(stop.reason)
      ? "Closing the trip."
      : "Booking stopped.",
    text: parts.join(" "),
    refundFailed: p.refundFailed.length > 0,
    onlyRefunds,
    actionLabel: settled
      ? "Finish closing the trip"
      : onlyRefunds
        ? "Check refund status"
        : "Return money & release holds",
    guidance: settled
      ? "All payments are settled. The organizer can finish closing the trip."
      : onlyRefunds
        ? "Refunds are processing. Check their status for provider confirmation."
        : "Return what was taken and release every hold. Harambee checks each payment with the provider first.",
  };
}

export function recoveryMessage(payments) {
  const p = paymentSummary(payments);
  if (p.refundFailed)
    return {
      heading: "Refund needs attention",
      text: `Your ${usd(p.refundFailed)} is still charged. The refund failed; your organizer needs to retry it. No new charge is being made.`,
    };
  if (p.checkingCapture)
    return {
      heading: "Checking your payment",
      text: `The outcome of your ${usd(p.checkingCapture)} payment is not confirmed. Your organizer is checking with the provider before the next step. No replacement charge is being made.`,
    };
  if (p.refundUnknown)
    return {
      heading: "Checking your refund",
      text: `The return of your ${usd(p.refundUnknown)} is not confirmed. Your organizer is checking with the provider; the refund will not be repeated without checking its outcome.`,
    };
  if (p.refundPending)
    return {
      heading: "Refund in progress",
      text: `Your ${usd(p.refundPending)} refund is pending provider confirmation. Your organizer is following its progress.`,
    };
  if (p.captured)
    return {
      heading: "Booking stopped",
      text: `Your ${usd(p.captured)} is captured and awaiting a refund. Your organizer needs to return the money; no new charge is being made.`,
    };
  if (p.checkingHold)
    return {
      heading: "Checking your hold",
      text: `The release of your ${usd(p.checkingHold)} hold is not confirmed. Your organizer is checking with the provider.`,
    };
  if (p.held)
    return {
      heading: "Booking stopped",
      text: `Your ${usd(p.held)} is held, not charged. Your organizer needs to release the hold.`,
    };
  return {
    heading: "Your payments are settled",
    text: p.returned
      ? `Your ${usd(p.returned)} has been returned. Nothing remains charged or held.`
      : "Nothing remains charged or held. Nothing for you to do.",
  };
}
export function recoveryLabel(payments) {
  const p = paymentSummary(payments);
  if (p.refundFailed)
    return `Refund failed · ${usd(p.refundFailed)} still charged`;
  if (p.checkingCapture) return "Checking payment outcome";
  if (p.refundUnknown) return "Checking refund outcome";
  if (p.refundPending) return `Refund pending · ${usd(p.refundPending)}`;
  if (p.captured) return `${usd(p.captured)} to return`;
  if (p.checkingHold) return "Checking hold release";
  if (p.held) return "Hold to release";
  return "Settled · nothing owed";
}

// Checkout actions are only meaningful for an active participant's current
// open-plan payment. Recovery outcomes must never resurrect an approval link.
export function participantCheckouts(state, actor) {
  if (
    state.provider !== "paypal-sandbox" ||
    !["collecting", "ready"].includes(state.status) ||
    !state.participants.some((p) => p.id === actor && p.active)
  )
    return [];
  const checkoutStates = [
    "created",
    "create_unknown",
    "approval_required",
    "buyer_approved",
    "authorization_unknown",
    "authorization_pending",
    "authorize_unknown",
  ];
  return state.payments
    .filter(
      (p) =>
        p.participantId === actor &&
        p.version === state.version &&
        p.sandboxSessionId &&
        checkoutStates.includes(p.status),
    )
    .map((p) => ({
      ...p,
      approvalUrl: p.status === "approval_required" ? p.approvalUrl : null,
      canConfirm: ["approval_required", "buyer_approved"].includes(p.status),
    }));
}
