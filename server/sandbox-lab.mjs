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
  async run(action, { id, amount, groupPlanId } = {}) {
    if (!this.client)
      throw new DomainError(
        "Add sandbox credentials to .env and restart to enable real sandbox calls.",
        503,
      );
    let session = this.state.sessions.find((s) => s.id === id);
    if (action === "create" && !session) {
      money(amount);
      if (amount < 100 || amount > 50000)
        throw new DomainError(
          "Use a sandbox test amount between $1 and $500.",
          400,
        );
      session = {
        id: id || randomUUID(),
        amount,
        groupPlanId: groupPlanId || null,
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
    try {
      if (action === "reconcile") {
        if (!session.orderId)
          throw new DomainError(
            "The order response is unknown. Inspect PayPal sandbox activity; do not create a replacement charge.",
          );
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
          if (detail.status === "VOIDED") session.status = "voided";
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
          if (confirmedByState[op.type]) {
            op.status = "confirmed";
            delete op.error;
          }
        }
        const unresolved = session.operations.find((o) =>
          ["pending", "unknown"].includes(o.status),
        );
        if (unresolved) {
          session.status = `${unresolved.type}_unknown`;
          session.investigation =
            "The provider has not proved the prior operation outcome. Inspect sandbox activity and reconcile again; no replacement charge is allowed.";
        } else delete session.investigation;
        session.lastReconciledAt = new Date().toISOString();
        this.save();
        return this.view();
      }
      const requirements = {
        authorize: ["approval_required", "buyer_approved"],
        capture: ["authorized"],
        void: ["authorized"],
        refund: ["captured"],
      };
      if (
        action !== "create" &&
        !requirements[action]?.includes(session.status)
      )
        throw new DomainError(
          "Reconcile this session before trying another payment transition.",
        );
      let op = session.operations.find((o) => o.type === action);
      if (op?.status === "confirmed") return this.view();
      if (op?.status === "unknown")
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
            ? await this.client.createOrder(session.amount, op.id)
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
          const a = r.purchase_units?.flatMap(
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
          verifyAmount(r.amount, session.amount);
          session.status =
            r.status === "COMPLETED" ? "captured" : "capture_pending";
        }
        if (action === "void") session.status = "voided";
        if (action === "refund") {
          session.refundId = r.id;
          verifyAmount(r.amount, session.amount);
          session.status =
            r.status === "COMPLETED" ? "refunded" : "refund_pending";
        }
        this.save();
        return this.view();
      } catch (error) {
        op.status =
          error.status >= 400 && error.status < 500 ? "failed" : "unknown";
        session.status =
          op.status === "unknown" ? `${action}_unknown` : session.status;
        op.error = error.status
          ? `PayPal returned HTTP ${error.status}`
          : "Provider result unknown; reconciliation required.";
        this.save();
        throw new DomainError(op.error, 502);
      }
    } finally {
      this.locks.delete(session.id);
    }
  }
}
