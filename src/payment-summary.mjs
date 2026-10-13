const usd = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 100 ? 2 : 0,
  }).format(n / 100);
export function paymentSummary(payments) {
  const sum = (...statuses) =>
    payments
      .filter((p) => statuses.includes(p.status))
      .reduce((n, p) => n + p.amount, 0);
  return {
    held: sum("authorized", "failed", "capture_declined"),
    captured: sum(
      "captured",
      "refund_pending",
      "refund_failed",
      "refund_unknown",
    ),
    returned: sum("refunded"),
    refundPending: sum("refund_pending"),
    refundFailed: sum("refund_failed"),
    refundUnknown: sum("refund_unknown"),
    checkingCapture: sum("capture_unknown", "capture_pending", "unknown"),
    checkingHold: sum(
      "authorization_unknown",
      "authorization_pending",
      "authorize_unknown",
      "void_unknown",
      "void_pending",
    ),
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
