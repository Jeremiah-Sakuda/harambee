import { randomUUID } from "node:crypto";
import { DomainError, money } from "./domain.mjs";
const verifyAmount = (amount, expected) => {
  if (
    !amount ||
    amount.currency_code !== "USD" ||
    !/^\d+(\.\d{1,2})?$/.test(amount.value) ||
    Math.round(Number(amount.value) * 100) !== expected
  )
    throw new DomainError(
      "Provider amount or currency does not match the approved sandbox amount; inspect the session before continuing.",
      502,
    );
};
export class SandboxLab {
  constructor(store, client) {
    this.store = store;
    this.client = client;
    this.state = store.load() || { sessions: [] };
    this.locks = new Set();
  }
  save() {
    this.store.save(this.state);
  }
  view() {
    return { configured: !!this.client, sessions: this.state.sessions };
  }
  async run(
    action,
    { id, amount, groupPlanId, returnUrl, cancelUrl, description } = {},
  ) {
    if (!this.client)
      throw new DomainError(
        "Add sandbox credentials to .env and restart to enable real sandbox calls.",
        503,
      );
    let session = this.state.sessions.find((s) => s.id === id);
    if (action === "create" && !session) {
      money(amount);
      // Group top-ups can legitimately be a few cents; the diagnostic lab keeps a $1 floor.
      if (amount < (groupPlanId ? 1 : 100) || amount > 50000)
        throw new DomainError(
          groupPlanId
            ? "PayPal sandbox shares must be between $0.01 and $500."
            : "Use a sandbox test amount between $1 and $500.",
          400,
        );
      session = {
        id: id || randomUUID(),
        amount,
        groupPlanId: groupPlanId || null,
        returnUrl: returnUrl || null,
        cancelUrl: cancelUrl || null,
        description: description || null,
        status: "created",
        operations: [],
        at: new Date().toISOString(),
      };
      this.state.sessions.push(session);
      this.save();
    }
    if (!session) throw new DomainError("Sandbox session not found.", 404);
    if (this.locks.has(session.id))
      throw new DomainError("This sandbox operation is already in progress.");
    this.locks.add(session.id);
    let replaying = false;
    try {
      if (action === "reconcile" && !session.orderId) {
        const createOp = session.operations.findLast(
          (o) => o.type === "create",
        );
        if (createOp && createOp.status !== "failed")
          // Replaying the same PayPal-Request-Id returns the original order instead of a new one.
          action = "create";
        else {
          session.status = "create_failed";
          this.save();
          return this.view();
        }
      }
      if (action === "reconcile") {
        const previousStatus = session.status;
        const order = await this.client.getOrder(session.orderId);
        session.payerId =
          order.payer?.payer_id ||
          order.payment_source?.paypal?.account_id ||
          session.payerId ||
          null;
        const auth = order.purchase_units?.flatMap(
          (u) => u.payments?.authorizations ?? [],
        )[0];
        const orderCapture = order.purchase_units?.flatMap(
          (u) => u.payments?.captures ?? [],
        )[0];
        if (orderCapture?.id) session.captureId = orderCapture.id;
        if (auth) {
          session.authorizationId = auth.id;
          const detail = await this.client.getAuthorization(auth.id);
          verifyAmount(detail.amount, session.amount);
          session.authorizationStatus = detail.status;
          // An expired or denied authorization holds no funds, like a voided one.
          if (["VOIDED", "EXPIRED", "DENIED"].includes(detail.status))
            session.status = "voided";
          else if (detail.status === "PENDING")
            session.status = "authorization_pending";
          else if (detail.status === "CREATED") session.status = "authorized";
          else if (detail.status === "CAPTURED")
            session.status = session.captureId ? "captured" : "capture_unknown";
        }
        if (session.captureId) {
          const capture = await this.client.getCapture(session.captureId);
          verifyAmount(capture.amount, session.amount);
          session.status =
            capture.status === "REFUNDED"
              ? "refunded"
              : capture.status === "COMPLETED"
                ? "captured"
                : "capture_pending";
          if (session.refundId) {
            const refund = await this.client.getRefund(session.refundId);
            verifyAmount(refund.amount, session.amount);
            session.status =
              refund.status === "COMPLETED" ? "refunded" : "refund_pending";
          } else if (
            previousStatus.startsWith("refund_") &&
            capture.status !== "REFUNDED"
          )
            session.status = previousStatus;
        }
        if (!auth && !session.captureId)
          session.status =
            order.status === "APPROVED"
              ? "buyer_approved"
              : "approval_required";
        const confirmedByState = {
          create: !!session.orderId,
          authorize:
            !!session.authorizationId &&
            !session.status.startsWith("authorization_"),
          capture: ["captured", "refunded", "refund_pending"].includes(
            session.status,
          ),
          void: session.status === "voided",
          refund: session.status === "refunded",
        };
        for (const op of session.operations) {
          if (op.status !== "failed" && confirmedByState[op.type]) {
            op.status = "confirmed";
            delete op.error;
          }
        }
        let unresolved = session.operations.find((o) =>
          ["pending", "unknown"].includes(o.status),
        );
        const lastCapture = session.operations.findLast(
          (o) => o.type === "capture",
        );
        // PayPal says captured but the response was lost: the same request ID returns that capture.
        if (
          session.authorizationStatus === "CAPTURED" &&
          !session.captureId &&
          lastCapture
        ) {
          lastCapture.status = "unknown";
          unresolved = lastCapture;
        }
        const settledAt = Date.parse(unresolved?.at ?? 0) + 60000;
        if (
          unresolved?.type === "capture" &&
          session.authorizationStatus === "CREATED" &&
          Date.now() > settledAt
        ) {
          // The capture never took effect, so the hold is still open and recovery can void it.
          // If a late capture lands first, the void fails definitively and the next reconcile replays it.
          unresolved.status = "failed";
          unresolved.error =
            "Not executed at PayPal; the authorization is still open.";
          session.status = "authorized";
          unresolved = null;
        }
        // Replaying the same PayPal-Request-Id is idempotent: PayPal returns the original
        // result if it processed the request, or performs it now if it never arrived.
        const replay =
          unresolved &&
          ((unresolved.type === "authorize" &&
            !auth &&
            order.status === "APPROVED") ||
            (unresolved.type === "capture" &&
              session.authorizationStatus === "CAPTURED") ||
            (unresolved.type === "void" &&
              session.authorizationStatus === "CREATED") ||
            (unresolved.type === "refund" &&
              session.captureId &&
              !session.refundId));
        session.lastReconciledAt = new Date().toISOString();
        if (replay) {
          action = unresolved.type;
          replaying = true;
          delete session.investigation;
        } else {
          if (unresolved) {
            session.status = `${unresolved.type}_unknown`;
            session.investigation =
              "The provider has not proved the prior operation outcome. Inspect sandbox activity and reconcile again; no replacement charge is allowed.";
          } else delete session.investigation;
          this.save();
          return this.view();
        }
      }
      const requirements = {
        authorize: ["approval_required", "buyer_approved"],
        capture: ["authorized"],
        void: ["authorized"],
        refund: ["captured"],
      };
      if (
        action !== "create" &&
        !replaying &&
        !requirements[action]?.includes(session.status)
      )
        throw new DomainError(
          "Reconcile this session before trying another payment transition.",
        );
      // A definite 4xx changed nothing at PayPal, so a retry gets a fresh request ID.
      let op = session.operations.findLast(
        (o) => o.type === action && o.status !== "failed",
      );
      if (op?.status === "confirmed") return this.view();
      if (op?.status === "unknown" && action !== "create" && !replaying)
        throw new DomainError(
          "The previous response is unknown. Reconcile with PayPal before continuing.",
        );
      if (!op) {
        op = {
          id: randomUUID(),
          type: action,
          status: "pending",
          at: new Date().toISOString(),
          amount: session.amount,
        };
        session.operations.push(op);
      }
      this.save();
      try {
        const r =
          action === "create"
            ? await this.client.createOrder(session.amount, op.id, {
                returnUrl: session.returnUrl,
                cancelUrl: session.cancelUrl,
                description: session.description,
              })
            : action === "authorize"
              ? await this.client.authorize(session.orderId, op.id)
              : action === "capture"
                ? await this.client.capture(session.authorizationId, op.id)
                : action === "void"
                  ? await this.client.void(session.authorizationId, op.id)
                  : await this.client.refund(session.captureId, op.id);
        op.status = "confirmed";
        op.providerId = r.id || session.authorizationId;
        if (action === "create") {
          session.orderId = r.id;
          session.approvalUrl = r.links?.find(
            (l) => l.rel === "approve" || l.rel === "payer-action",
          )?.href;
          if (
            session.approvalUrl &&
            new URL(session.approvalUrl).hostname !== "www.sandbox.paypal.com"
          )
            throw new Error("Unexpected checkout host");
          session.status = "approval_required";
        }
        if (action === "authorize") {
          session.payerId =
            r.payer?.payer_id || r.payment_source?.paypal?.account_id || null;
          const order = r.purchase_units
            ? r
            : await this.client.getOrder(session.orderId);
          session.payerId ||=
            order.payer?.payer_id ||
            order.payment_source?.paypal?.account_id ||
            null;
          const a = order.purchase_units?.flatMap(
            (u) => u.payments?.authorizations ?? [],
          )[0];
          if (!a?.id)
            throw new Error("Authorization not found in provider response");
          session.authorizationId = a.id;
          verifyAmount(a.amount, session.amount);
          session.status =
            a.status === "CREATED" ? "authorized" : "authorization_pending";
        }
        if (action === "capture") {
          session.captureId = r.id;
          const capture = r.amount ? r : await this.client.getCapture(r.id);
          verifyAmount(capture.amount, session.amount);
          session.status =
            capture.status === "COMPLETED" ? "captured" : "capture_pending";
        }
        if (action === "void") session.status = "voided";
        if (action === "refund") {
          session.refundId = r.id;
          const refund = r.amount ? r : await this.client.getRefund(r.id);
          verifyAmount(refund.amount, session.amount);
          session.status =
            refund.status === "COMPLETED" ? "refunded" : "refund_pending";
        }
        this.save();
        return this.view();
      } catch (error) {
        op.status =
          error.status >= 400 && error.status < 500 ? "failed" : "unknown";
        session.status =
          op.status === "unknown"
            ? `${action}_unknown`
            : action === "create"
              ? "create_failed"
              : session.status;
        const issue =
          error.details?.details?.[0]?.issue || error.details?.name || "";
        // Local verification failures are not provider HTTP errors; say which one happened.
        op.error =
          error instanceof DomainError
            ? error.message
            : error.status
              ? `PayPal returned HTTP ${error.status}${issue ? ` (${issue})` : ""}`
              : "Provider result unknown; reconciliation required.";
        if (error.details?.debug_id) op.debugId = error.details.debug_id;
        this.save();
        throw new DomainError(op.error, 502);
      }
    } finally {
      this.locks.delete(session.id);
    }
  }
}
