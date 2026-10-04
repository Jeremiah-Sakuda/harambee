import test from "node:test";
import assert from "node:assert/strict";
import { SandboxLab } from "../server/sandbox-lab.mjs";
import { PayPalSandbox } from "../server/paypal.mjs";
const fixture = (client) => {
  let value;
  return new SandboxLab(
    {
      load: () => value,
      save: (s) => {
        value = structuredClone(s);
      },
    },
    client,
  );
};
test("sandbox requires credentials and positive bounded cents", async () => {
  await assert.rejects(
    fixture(null).run("create", { amount: 100 }),
    /credentials/,
  );
  const lab = fixture({});
  await assert.rejects(lab.run("create", { amount: 0 }), /between/);
  await assert.rejects(lab.run("create", { amount: 100.5 }), /whole cents/);
});
test("sandbox buyer approval, authorization, capture and refund record stable operation keys", async () => {
  const calls = [];
  const client = {
    createOrder: async (n, key) => {
      calls.push(["create", n, key]);
      return {
        id: "ORDER1",
        links: [
          {
            rel: "approve",
            href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER1",
          },
        ],
      };
    },
    authorize: async (id, key) => {
      calls.push(["authorize", id, key]);
      return {
        id: "ORDER1",
        purchase_units: [
          {
            payments: {
              authorizations: [
                {
                  id: "AUTH1",
                  status: "CREATED",
                  amount: { currency_code: "USD", value: "1.00" },
                },
              ],
            },
          },
        ],
      };
    },
    capture: async (id, key) => {
      calls.push(["capture", id, key]);
      return {
        id: "CAP1",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "1.00" },
      };
    },
    refund: async (id, key) => {
      calls.push(["refund", id, key]);
      return {
        id: "REF1",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "1.00" },
      };
    },
  };
  const lab = fixture(client);
  await lab.run("create", { amount: 100 });
  const id = lab.state.sessions[0].id;
  await assert.rejects(lab.run("capture", { id }), /Reconcile/);
  await lab.run("authorize", { id });
  await lab.run("capture", { id });
  await lab.run("refund", { id });
  assert.equal(lab.state.sessions[0].status, "refunded");
  assert.equal(calls.length, 4);
  assert.ok(
    calls.every((c, i) => c[2] === lab.state.sessions[0].operations[i].id),
  );
  await assert.rejects(lab.run("capture", { id }), /Reconcile/);
});
test("unknown capture stops retries and preserves evidence", async () => {
  const lab = fixture({
    capture: async () => {
      throw new Error("timeout");
    },
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "authorized",
    authorizationId: "AUTH1",
    operations: [],
  });
  await assert.rejects(lab.run("capture", { id: "session" }), /unknown/);
  assert.equal(lab.state.sessions[0].status, "capture_unknown");
  assert.equal(lab.state.sessions[0].operations[0].status, "unknown");
  await assert.rejects(lab.run("capture", { id: "session" }), /Reconcile/);
  assert.equal(lab.state.sessions[0].operations.length, 1);
});
test("PayPal adapter formats cents, authorizes Orders v2, captures and refunds with request IDs", async () => {
  const client = new PayPalSandbox({ clientId: "fixture", secret: "fixture" });
  const calls = [];
  client.request = async (...args) => {
    calls.push(args);
    return {};
  };
  await client.createOrder(12345, "op1");
  await client.authorize("O1", "op2");
  await client.capture("A1", "op3");
  await client.void("A1", "op4");
  await client.refund("C1", "op5");
  assert.equal(calls[0][1].body.purchase_units[0].amount.value, "123.45");
  assert.equal(calls[0][1].body.intent, "AUTHORIZE");
  assert.equal(calls[1][0], "/v2/checkout/orders/O1/authorize");
  assert.equal(calls[2][0], "/v2/payments/authorizations/A1/capture");
  assert.equal(calls[3][0], "/v2/payments/authorizations/A1/void");
  assert.equal(calls[4][0], "/v2/payments/captures/C1/refund");
  assert.deepEqual(
    calls.map((c) => c[1].key),
    ["op1", "op2", "op3", "op4", "op5"],
  );
});
test("provider amount mismatch cannot mark authorization confirmed", async () => {
  const lab = fixture({
    authorize: async () => ({
      purchase_units: [
        {
          payments: {
            authorizations: [
              {
                id: "AUTH-WRONG",
                status: "CREATED",
                amount: { currency_code: "EUR", value: "1.00" },
              },
            ],
          },
        },
      ],
    }),
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "buyer_approved",
    orderId: "ORDER",
    operations: [],
  });
  await assert.rejects(lab.run("authorize", { id: "session" }));
  assert.equal(lab.state.sessions[0].status, "authorize_unknown");
  await assert.rejects(lab.run("capture", { id: "session" }), /Reconcile/);
});
test("reconciliation preserves a pending refund even while capture is completed", async () => {
  const amount = { currency_code: "USD", value: "1.00" };
  const lab = fixture({
    getOrder: async () => ({
      purchase_units: [{ payments: { authorizations: [{ id: "AUTH" }] } }],
    }),
    getAuthorization: async () => ({ status: "CAPTURED", amount }),
    getCapture: async () => ({ status: "COMPLETED", amount }),
    getRefund: async () => ({ status: "PENDING", amount }),
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "refund_pending",
    orderId: "ORDER",
    captureId: "CAPTURE",
    refundId: "REFUND",
    operations: [],
  });
  await lab.run("reconcile", { id: "session" });
  assert.equal(lab.state.sessions[0].status, "refund_pending");
  await assert.rejects(lab.run("refund", { id: "session" }), /Reconcile/);
});
