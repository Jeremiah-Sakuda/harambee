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

test("a CREATED authorization does not erase an unknown capture or offer a new capture", async () => {
  const lab = fixture({
    capture: async () => {
      throw Error("timeout");
    },
    getOrder: async () => ({
      purchase_units: [{ payments: { authorizations: [{ id: "AUTH" }] } }],
    }),
    getAuthorization: async () => ({
      status: "CREATED",
      amount: { currency_code: "USD", value: "1.00" },
    }),
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "authorized",
    authorizationId: "AUTH",
    orderId: "ORDER",
    operations: [],
  });
  await assert.rejects(lab.run("capture", { id: "session" }));
  await lab.run("reconcile", { id: "session" });
  assert.equal(lab.state.sessions[0].status, "capture_unknown");
  assert.match(lab.state.sessions[0].investigation, /not proved/);
  await assert.rejects(lab.run("capture", { id: "session" }), /Reconcile/);
});

test("a definite 4xx is retried with a fresh PayPal-Request-Id", async () => {
  const keys = [];
  let approved = false;
  const lab = fixture({
    authorize: async (id, key) => {
      keys.push(key);
      if (!approved)
        throw Object.assign(Error("not approved"), {
          status: 422,
          details: { details: [{ issue: "ORDER_NOT_APPROVED" }] },
        });
      return {
        payer: { payer_id: "BUYER" },
        purchase_units: [
          {
            payments: {
              authorizations: [
                {
                  id: "AUTH",
                  status: "CREATED",
                  amount: { currency_code: "USD", value: "1.00" },
                },
              ],
            },
          },
        ],
      };
    },
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "approval_required",
    orderId: "ORDER",
    operations: [],
  });
  await assert.rejects(
    lab.run("authorize", { id: "session" }),
    /ORDER_NOT_APPROVED/,
  );
  approved = true;
  await lab.run("authorize", { id: "session" });
  assert.equal(lab.state.sessions[0].status, "authorized");
  assert.notEqual(keys[0], keys[1]);
});

test("PayPal adapter asks for full representations and sets checkout return URLs", async () => {
  const client = new PayPalSandbox({ clientId: "fixture", secret: "fixture" });
  client.token = "token";
  client.tokenUntil = Date.now() + 60000;
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    sent.push({ url, init });
    return new Response(JSON.stringify({ id: "X" }), { status: 201 });
  };
  try {
    await client.createOrder(100, "op1", {
      returnUrl: "http://127.0.0.1:5171/?paypal=return",
      cancelUrl: "http://127.0.0.1:5171/?paypal=cancel",
    });
    await client.getOrder("X");
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(sent[0].init.headers.Prefer, "return=representation");
  assert.equal(sent[0].init.headers["PayPal-Request-Id"], "op1");
  const context = JSON.parse(sent[0].init.body).payment_source.paypal
    .experience_context;
  assert.equal(context.return_url, "http://127.0.0.1:5171/?paypal=return");
  assert.equal(context.cancel_url, "http://127.0.0.1:5171/?paypal=cancel");
  assert.equal(sent[1].init.headers.Prefer, undefined);
});

// A captured session whose provider double records every refund write per request ID.
const capturedLab = (refundBehaviour) => {
  const amount = { currency_code: "USD", value: "1.00" };
  const capture = { id: "CAP", status: "COMPLETED", amount };
  const refunds = [],
    keys = [];
  const lab = fixture({
    refund: async (id, key) => {
      keys.push(key);
      const outcome = refundBehaviour(keys.length);
      if (outcome) throw outcome;
      // PayPal-Request-Id is idempotent: the same key never refunds twice.
      let r = refunds.find((x) => x.key === key);
      if (!r) {
        r = {
          id: `REF${refunds.length + 1}`,
          key,
          status: "COMPLETED",
          amount,
        };
        refunds.push(r);
        capture.status = "REFUNDED";
      }
      return r;
    },
    getOrder: async () => ({
      purchase_units: [
        {
          payments: {
            authorizations: [{ id: "AUTH" }],
            captures: [capture],
            refunds: refunds.map(({ key, ...r }) => r),
          },
        },
      ],
    }),
    getAuthorization: async () => ({ status: "CAPTURED", amount }),
    getCapture: async () => capture,
    getRefund: async (id) => refunds.find((r) => r.id === id),
  });
  lab.state.sessions.push({
    id: "session",
    amount: 100,
    status: "captured",
    orderId: "ORDER",
    authorizationId: "AUTH",
    captureId: "CAP",
    operations: [],
  });
  return { lab, refunds, keys, session: () => lab.state.sessions[0] };
};

for (const [name, error] of [
  [
    "PREVIOUS_REQUEST_IN_PROGRESS",
    {
      status: 422,
      details: { details: [{ issue: "PREVIOUS_REQUEST_IN_PROGRESS" }] },
    },
  ],
  [
    "DUPLICATE_REQUEST_ID",
    { status: 422, details: { details: [{ issue: "DUPLICATE_REQUEST_ID" }] } },
  ],
  ["HTTP 409", { status: 409, details: {} }],
  ["HTTP 429", { status: 429, details: { name: "RATE_LIMIT_REACHED" } }],
])
  test(`a replay answered ${name} stays unknown and settles on the next reconcile`, async () => {
    const f = capturedLab((n) =>
      n === 1
        ? Error("timeout")
        : n === 2
          ? Object.assign(Error("undecided"), error)
          : null,
    );
    await assert.rejects(f.lab.run("refund", { id: "session" }), /unknown/);
    assert.equal(f.session().status, "refund_unknown");
    // The reconcile replays the same request ID and PayPal has not decided yet.
    await assert.rejects(f.lab.run("reconcile", { id: "session" }));
    assert.equal(f.session().status, "refund_unknown");
    assert.equal(f.session().operations.length, 1);
    assert.equal(f.session().operations[0].status, "unknown");
    await f.lab.run("reconcile", { id: "session" });
    assert.equal(f.session().status, "refunded");
    assert.equal(f.refunds.length, 1);
    assert.equal(new Set(f.keys).size, 1, "one request ID for the capture");
  });

test("a refund replay PayPal definitively rejects becomes a deliberate retry only after the capture is re-read", async () => {
  const f = capturedLab((n) =>
    n === 1
      ? Error("timeout")
      : n === 2
        ? Object.assign(Error("rejected"), {
            status: 422,
            details: { details: [{ issue: "UNPROCESSABLE" }] },
          })
        : null,
  );
  await assert.rejects(f.lab.run("refund", { id: "session" }));
  await assert.rejects(f.lab.run("reconcile", { id: "session" }));
  assert.equal(f.session().operations[0].status, "failed");
  // No unresolved operation remains: PayPal's records decide what comes next.
  await f.lab.run("reconcile", { id: "session" });
  assert.equal(f.session().status, "refund_failed");
  assert.match(f.session().providerIssue, /still shows the capture completed/);
  assert.equal(f.keys.length, 2, "reconcile itself issued no refund");
  await f.lab.run("refund", { id: "session" });
  assert.equal(f.session().status, "refunded");
  assert.equal(f.refunds.length, 1);
  assert.notEqual(f.keys[2], f.keys[0], "the retry uses a new request ID");
});

test("a stuck refund_unknown with a refund already on PayPal settles without another refund", async () => {
  const f = capturedLab(() => null);
  await f.lab.run("refund", { id: "session" });
  const s = f.session();
  // Simulate a lost local result after PayPal refunded, and a failed replay record.
  s.status = "refund_unknown";
  delete s.refundId;
  s.operations[0].status = "failed";
  await f.lab.run("reconcile", { id: "session" });
  assert.equal(s.status, "refunded");
  assert.equal(f.keys.length, 1);
});
