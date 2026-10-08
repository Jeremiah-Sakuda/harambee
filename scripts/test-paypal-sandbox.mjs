// Explicit, resumable test-only PayPal workflow. Never reads the app's existing payment stores.
import { mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { Store } from "../server/store.mjs";
import { PayPalSandbox } from "../server/paypal.mjs";
import { SandboxLab } from "../server/sandbox-lab.mjs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";

const args = process.argv.slice(2),
  action = args[0],
  directory = args[1];
if (
  !["prepare", "run", "status"].includes(action) ||
  !directory ||
  args.length !== 2
) {
  console.error(
    "Usage: node scripts/test-paypal-sandbox.mjs prepare|run|status /absolute/isolated-test-directory",
  );
  process.exit(2);
}
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {}
const dir = resolve(directory);
// Only these fresh files are used. The directory must never point at the app's data folder.
if (dir === resolve("data") || existsSync(join(dir, "plan.json")))
  throw Error("Choose a separate test directory without a trip store.");
mkdirSync(dir, { recursive: true, mode: 0o700 });
const store = new Store(join(dir, "sandbox-test-sessions.json"));
const evidenceStore = new Store(join(dir, "sandbox-test-evidence.json"));
const client = new PayPalSandbox(),
  lab = new SandboxLab(store, client);
let evidence = evidenceStore.load();
if (action === "status") {
  console.log(
    JSON.stringify(
      lab.state.sessions.map(
        ({ id, status, orderId, authorizationId, captureId, refundId }) => ({
          id,
          status,
          orderId,
          authorizationId,
          captureId,
          refundId,
        }),
      ),
      null,
      2,
    ),
  );
  process.exit(0);
}
const source = sourceFingerprint();
evidence ||= {
  mode: "actual-paypal-sandbox-with-local-response-loss",
  startedAt: new Date().toISOString(),
  source,
  provider: "https://api-m.sandbox.paypal.com",
  testAmountPerOrderCents: 100,
  completion: "awaiting-buyer-approvals",
  results: [],
  calls: [],
};
const originalRequest = client.request.bind(client);
client.request = async (path, options = {}) => {
  const call = {
    at: new Date().toISOString(),
    method: options.method || "POST",
    path,
    requestId: options.key || null,
  };
  evidence.calls.push(call);
  evidenceStore.save(evidence);
  try {
    const result = await originalRequest(path, options);
    Object.assign(call, {
      resourceId: result.id || null,
      resourceStatus: result.status || null,
      successful: true,
    });
    evidenceStore.save(evidence);
    return result;
  } catch (error) {
    Object.assign(call, {
      successful: false,
      httpStatus: error.status || null,
      issue:
        error.details?.details?.[0]?.issue ||
        error.details?.name ||
        error.message,
    });
    evidenceStore.save(evidence);
    throw error;
  }
};
function record(id, observation) {
  evidence.results.push({
    id,
    at: new Date().toISOString(),
    status: "passed",
    observation,
  });
  evidenceStore.save(evidence);
  console.log(`passed ${id}`);
}
function restart() {
  return new SandboxLab(store, client);
}
if (action === "prepare") {
  if (lab.state.sessions.length)
    throw Error(
      "Already prepared: use status or run to preserve the original test records.",
    );
  for (const flow of ["refund", "void"]) {
    const id = `oct7-${flow}-${randomUUID()}`;
    await lab.run("create", {
      id,
      amount: 100,
      returnUrl: "http://127.0.0.1:3702/?paypal=lab",
      description: `Harambee ${flow} recovery test — sandbox only`,
    });
    const session = lab.state.sessions.find((s) => s.id === id);
    session.testFlow = flow;
    lab.save();
    const order = await client.getOrder(session.orderId);
    assert.equal(order.purchase_units[0].amount.currency_code, "USD");
    assert.equal(order.purchase_units[0].amount.value, "1.00");
    record(`${flow}-create-and-read`, {
      orderId: order.id,
      status: order.status,
      amount: order.purchase_units[0].amount,
    });
    const key = session.operations.find((o) => o.type === "create").id;
    const replay = await client.createOrder(100, key, {
      returnUrl: session.returnUrl,
      description: session.description,
      customId: session.id,
    });
    assert.equal(replay.id, session.orderId);
    record(`${flow}-create-idempotency`, {
      orderId: replay.id,
      requestId: key,
    });
    if (flow === "void") {
      await assert.rejects(lab.run("authorize", { id }), /HTTP 422/);
      assert.equal(session.authorizationId, undefined);
      assert.equal(session.operations.at(-1).status, "failed");
      record("unapproved-order-cannot-authorize", {
        orderId: session.orderId,
        status: session.status,
        operationStatus: session.operations.at(-1).status,
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        needsBuyerApproval: lab.state.sessions.map((s) => ({
          flow: s.testFlow,
          amount: "$1.00 USD sandbox",
          approvalUrl: s.approvalUrl,
        })),
        evidenceFile: evidenceStore.path,
      },
      null,
      2,
    ),
  );
} else {
  assert.equal(
    lab.state.sessions.length,
    2,
    "Prepare exactly two isolated sessions first.",
  );
  // Check BOTH orders before dispatching either authorization or capture.
  for (const session of lab.state.sessions) {
    if (session.status === "approval_required") {
      const order = await client.getOrder(session.orderId);
      if (order.status !== "APPROVED") {
        evidence.completion = "awaiting-buyer-approvals";
        evidence.updatedAt = new Date().toISOString();
        evidenceStore.save(evidence);
        console.error(
          `Buyer approval needed for the ${session.testFlow} $1 sandbox order. Open its saved approvalUrl, then rerun.`,
        );
        process.exit(3);
      }
    }
  }
  for (const original of lab.state.sessions) {
    const id = original.id,
      flow = original.testFlow;
    let current = restart(),
      session = current.state.sessions.find((s) => s.id === id);
    if (
      session.status === "approval_required" ||
      session.status === "buyer_approved"
    ) {
      await current.run("authorize", { id });
      assert.equal(session.status, "authorized");
      const auth = await client.getAuthorization(session.authorizationId);
      assert.equal(auth.status, "CREATED");
      record(`${flow}-authorize-and-read`, {
        authorizationId: auth.id,
        status: auth.status,
        amount: auth.amount,
      });
    }
    if (flow === "refund" && session.status === "authorized") {
      await current.run("capture", { id });
      const capture = await client.getCapture(session.captureId);
      assert.equal(capture.status, "COMPLETED");
      assert.equal(capture.amount.value, "1.00");
      record("capture-and-read", {
        captureId: capture.id,
        status: capture.status,
        amount: capture.amount,
      });
    }
    if (
      (flow === "refund" && session.status === "captured") ||
      (flow === "void" && session.status === "authorized")
    ) {
      const real = client[flow].bind(client);
      client[flow] = async (...params) => {
        const response = await real(...params);
        // Discard ONLY the successful response, after the real provider operation.
        // Record that injection before throwing, so a resumed run cannot silently count a clean response as loss.
        record(`${flow}-response-intentionally-discarded`, {
          resourceId: response.id || session.authorizationId,
          providerStatus: response.status || null,
        });
        throw Error(
          "Injected local response loss after successful sandbox operation",
        );
      };
      try {
        await assert.rejects(
          current.run(flow, { id }),
          /Provider result unknown/,
        );
        assert.equal(session.status, `${flow}_unknown`);
      } finally {
        client[flow] = real;
      }
    }
    if ([`${flow}_unknown`, "refund_pending"].includes(session.status)) {
      current = restart();
      await current.run("reconcile", { id });
      session = current.state.sessions.find((s) => s.id === id);
    }
    const expected = flow === "refund" ? "refunded" : "voided";
    if (session.status !== expected)
      throw Error(
        `${flow} still ${session.status}; preserved evidence. Check PayPal, then resume run.`,
      );
    const writes = evidence.calls.filter(
      (c) => c.method === "POST" && c.path.endsWith(`/${flow}`) && c.successful,
    );
    const providerKeys = new Set(writes.map((c) => c.requestId));
    assert.equal(
      providerKeys.size,
      1,
      "Recovery must use the original provider request ID.",
    );
    const provider =
      flow === "refund"
        ? await client.getRefund(writes[0].resourceId)
        : await client.getAuthorization(session.authorizationId);
    assert.equal(provider.status, flow === "refund" ? "COMPLETED" : "VOIDED");
    assert.equal(provider.amount.currency_code, "USD");
    assert.equal(provider.amount.value, "1.00");
    record(`${flow}-recovery-after-restart`, {
      status: session.status,
      providerWriteAttempts: writes.length,
      distinctRequestIds: providerKeys.size,
      captureId: session.captureId,
      refundId: session.refundId,
      authorizationId: session.authorizationId,
    });
  }
  evidence.completion = "completed";
}
evidence.finishedSource = sourceFingerprint();
evidence.sourceStable =
  JSON.stringify(source.sha256) ===
  JSON.stringify(evidence.finishedSource.sha256);
evidence.updatedAt = new Date().toISOString();
evidenceStore.save(evidence);
console.log(`Evidence: ${evidenceStore.path}`);
