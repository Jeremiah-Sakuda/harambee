import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/paypal-fixture.mjs";
import {
  matchSession,
  receiveWebhook,
  reconcileSession,
} from "../server/paypal-webhook.mjs";
import { PayPalSandbox } from "../server/paypal.mjs";

const headers = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/X",
  "paypal-transmission-id": "T1",
  "paypal-transmission-sig": "SIG",
  "paypal-transmission-time": "2026-10-13T00:00:00Z",
};
// A hold Maya authorized, which PayPal has since voided; the event claims otherwise.
async function voidedHold() {
  const f = fixture();
  await f.approve("maya");
  const p = f.e.state.payments[0];
  assert.equal(p.status, "authorized");
  f.auths.get(p.providerId).status = "VOIDED";
  let reads = 0;
  const getOrder = f.client.getOrder;
  f.client.getOrder = async (id) => {
    reads++;
    return getOrder(id);
  };
  const verified = [];
  const deliver = (event, status = "SUCCESS", extra = {}) =>
    receiveWebhook({
      client: {
        verifyWebhookSignature: async (args) => {
          verified.push(args);
          return { verification_status: status };
        },
      },
      webhookId: "WH-1",
      headers,
      rawBody: JSON.stringify(event),
      sessions: f.lab.state.sessions,
      ...extra,
    });
  const event = {
    id: "WH-EVENT-1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAPTURE-FROM-PAYLOAD",
      status: "COMPLETED",
      supplementary_data: { related_ids: { authorization_id: p.providerId } },
    },
  };
  return { f, p, deliver, event, verified, reads: () => reads };
}

test("an unverified webhook is rejected and changes nothing", async () => {
  const w = await voidedHold();
  const before = structuredClone(w.f.e.state);
  const result = await w.deliver(w.event, "FAILURE");
  assert.equal(result.status, 400);
  assert.equal(result.session, undefined);
  assert.equal(w.verified.length, 1);
  assert.equal(w.reads(), 0);
  assert.deepEqual(w.f.e.state, before);
});

test("a webhook missing PayPal's signature headers is rejected without asking PayPal", async () => {
  const w = await voidedHold();
  const result = await receiveWebhook({
    client: {
      verifyWebhookSignature: async () => assert.fail("not verifiable"),
    },
    webhookId: "WH-1",
    headers: {},
    rawBody: JSON.stringify(w.event),
    sessions: w.f.lab.state.sessions,
  });
  assert.equal(result.status, 400);
});

test("webhooks are disabled without PAYPAL_WEBHOOK_ID", async () => {
  const w = await voidedHold();
  const result = await w.deliver(w.event, "SUCCESS", { webhookId: "" });
  assert.equal(result.status, 503);
  assert.equal(w.verified.length, 0);
});

test("a verified webhook reconciles from PayPal's records, never the payload's status", async () => {
  const w = await voidedHold();
  const result = await w.deliver(w.event);
  assert.equal(result.status, 200);
  assert.equal(w.verified[0].webhookId, "WH-1");
  assert.equal(w.verified[0].rawBody, JSON.stringify(w.event));
  assert.equal(result.session.id, w.p.sandboxSessionId);
  await reconcileSession({
    engine: w.f.e,
    lab: w.f.lab,
    session: result.session,
  });
  assert.ok(w.reads() > 0, "reconcile read the order from PayPal");
  // The payload said COMPLETED; PayPal's authorization says VOIDED.
  assert.equal(w.p.status, "voided");
  assert.equal(w.p.captureId, undefined);
  assert.equal(w.f.caps.size, 0);
});

test("a verified event of another kind, or for no known session, is acknowledged and ignored", async () => {
  const w = await voidedHold();
  const other = await w.deliver({
    ...w.event,
    event_type: "CUSTOMER.DISPUTE.CREATED",
  });
  assert.equal(other.status, 200);
  assert.equal(other.session, undefined);
  const unknown = await w.deliver({
    ...w.event,
    resource: { id: "NOT-OURS", status: "COMPLETED" },
  });
  assert.equal(unknown.status, 200);
  assert.equal(unknown.session, undefined);
  assert.equal(w.reads(), 0);
  assert.equal(w.p.status, "authorized");
});

test("webhook resources match sessions by order, capture link or custom_id", () => {
  const sessions = [
    { id: "s1", orderId: "O1", authorizationId: "A1", captureId: "C1" },
    { id: "s2", groupPlanId: "plan" },
  ];
  assert.equal(matchSession(sessions, { id: "O1" }).id, "s1");
  assert.equal(
    matchSession(sessions, {
      id: "REFUND-1",
      links: [
        { rel: "self", href: "https://x/v2/payments/refunds/REFUND-1" },
        { rel: "up", href: "https://x/v2/payments/captures/C1" },
      ],
    }).id,
    "s1",
  );
  assert.equal(
    matchSession(sessions, { purchase_units: [{ custom_id: "plan:s2" }] }).id,
    "s2",
  );
  assert.equal(matchSession(sessions, { id: "nope" }), undefined);
});

test("a verified webhook for a diagnostic lab session runs the lab's reconcile", async () => {
  const runs = [];
  await reconcileSession({
    engine: { state: { id: "plan", payments: [] } },
    lab: { run: async (...args) => runs.push(args) },
    session: { id: "lab-1", groupPlanId: null },
  });
  assert.deepEqual(runs, [["reconcile", { id: "lab-1" }]]);
});

test("PayPal adapter verifies webhook signatures with the raw event embedded verbatim", async () => {
  const client = new PayPalSandbox({ clientId: "fixture", secret: "fixture" });
  const calls = [];
  client.request = async (...args) => {
    calls.push(args);
    return { verification_status: "SUCCESS" };
  };
  const rawBody = '{"id":"WH-1",  "event_type":"PAYMENT.CAPTURE.COMPLETED"}';
  await client.verifyWebhookSignature({ headers, rawBody, webhookId: "WH" });
  assert.equal(calls[0][0], "/v1/notifications/verify-webhook-signature");
  const sent = calls[0][1].body;
  assert.ok(sent.endsWith(`"webhook_event":${rawBody}}`));
  assert.deepEqual(JSON.parse(sent), {
    auth_algo: "SHA256withRSA",
    cert_url: headers["paypal-cert-url"],
    transmission_id: "T1",
    transmission_sig: "SIG",
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: "WH",
    webhook_event: JSON.parse(rawBody),
  });
});
