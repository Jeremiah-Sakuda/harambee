import { GroupPayments } from "./group-payments.mjs";

// PayPal webhooks are a prompt to reconcile, never a source of truth: the event's status is
// ignored, and the session is re-read from PayPal by the same reconcile polling uses.
const HANDLED = [
  "CHECKOUT.ORDER.",
  "PAYMENT.AUTHORIZATION.",
  "PAYMENT.CAPTURE.",
];
const SIGNATURE_HEADERS = [
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
];

// Every PayPal resource ID the event names, plus the custom_id Harambee set on the order.
function references(resource = {}) {
  const related = resource.supplementary_data?.related_ids ?? {};
  const ids = [
    resource.id,
    related.order_id,
    related.authorization_id,
    related.capture_id,
    // A refund event's resource links "up" to the capture it refunded.
    ...(resource.links ?? [])
      .filter((l) => l.rel === "up" && typeof l.href === "string")
      .map((l) => l.href.split("/").at(-1)),
  ].filter((id) => typeof id === "string" && id);
  const customIds = [
    resource.custom_id,
    ...(resource.purchase_units ?? []).map((u) => u.custom_id),
  ].filter((id) => typeof id === "string" && id);
  return { ids, customIds };
}

export function matchSession(sessions, resource) {
  const { ids, customIds } = references(resource);
  return (
    sessions.find((s) =>
      [s.orderId, s.authorizationId, s.captureId, s.refundId]
        .filter(Boolean)
        .some((id) => ids.includes(id)),
    ) ??
    // custom_id is "<planId>:<sessionId>" for group payments, or the session ID alone.
    sessions.find((s) => customIds.some((c) => c.split(":").at(-1) === s.id))
  );
}

// Verifies the delivery with PayPal, then names the lab session to reconcile (if any).
// Returns the HTTP answer for PayPal; `session` is set only for a verified, matched event.
export async function receiveWebhook({
  client,
  webhookId,
  headers,
  rawBody,
  sessions,
}) {
  if (!client || !webhookId)
    return {
      status: 503,
      body: { error: "PayPal sandbox webhooks are not configured." },
    };
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid JSON." } };
  }
  if (
    !event ||
    typeof event !== "object" ||
    SIGNATURE_HEADERS.some((h) => typeof headers[h] !== "string")
  )
    return { status: 400, body: { error: "Unverified webhook." } };
  let verification;
  try {
    verification = await client.verifyWebhookSignature({
      headers,
      rawBody,
      webhookId,
    });
  } catch {
    // PayPal could not be asked; a non-2xx answer makes PayPal redeliver later.
    return {
      status: 502,
      body: { error: "Webhook verification unavailable." },
    };
  }
  if (verification?.verification_status !== "SUCCESS")
    return { status: 400, body: { error: "Unverified webhook." } };
  const type = String(event.event_type ?? "");
  if (!HANDLED.some((prefix) => type.startsWith(prefix)))
    return { status: 200, body: { received: true, ignored: true } };
  const session = matchSession(sessions, event.resource);
  return { status: 200, body: { received: true }, session };
}

// Runs the existing reconcile for a matched session: through the trip coordinator when it
// belongs to the current plan (so the plan's payment record updates too), else the lab's own.
export async function reconcileSession({ engine, lab, session }) {
  const payment =
    session.groupPlanId &&
    session.groupPlanId === engine.state.id &&
    engine.state.payments.find((p) => p.sandboxSessionId === session.id);
  if (payment)
    return new GroupPayments(engine, lab).reconcile("organizer", payment.id);
  await lab.run("reconcile", { id: session.id });
}
