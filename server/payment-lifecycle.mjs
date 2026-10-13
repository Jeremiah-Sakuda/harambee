import { randomUUID } from "node:crypto";
import { DomainError } from "./domain.mjs";

export const paymentSettled = (payment) =>
  ["voided", "refunded", "abandoned"].includes(payment.status);

// Owns the durable plan-payment/provider-session protocol. SandboxLab owns
// provider operations; callers never need its session shape or save ordering.
export class PaymentLifecycle {
  constructor(engine, lab) {
    this.engine = engine;
    this.lab = lab;
  }
  get s() {
    return this.engine.state;
  }
  #session(p) {
    return this.lab.state.sessions.find((s) => s.id === p.sandboxSessionId);
  }
  async create(
    { participantId, version, amount },
    { appUrl, description } = {},
  ) {
    const p = {
      id: randomUUID(),
      participantId,
      version,
      amount,
      status: "created",
      sandboxSessionId: randomUUID(),
    };
    // This record must survive even if session creation is interrupted.
    this.s.payments.push(p);
    this.engine.persist();
    const back = (result) =>
      appUrl
        ? `${appUrl}/?${new URLSearchParams({ participant: participantId, paypal: result, payment: p.id })}`
        : undefined;
    await this.execute(p, "create", {
      returnUrl: back("return"),
      cancelUrl: back("cancel"),
      description,
    });
    return p;
  }
  #sync(p) {
    if (p.status === "abandoned") return;
    const session = this.#session(p);
    if (!session) return;
    // A definitely rejected order create, or an order PayPal dropped before approval, left nothing held.
    p.status = ["create_failed", "expired_unapproved"].includes(session.status)
      ? "abandoned"
      : session.status;
    p.providerIssue = session.providerIssue ?? null;
    p.providerId = session.authorizationId || session.orderId || null;
    p.captureId = session.captureId;
    p.refundId = session.refundId;
    p.refundReferenceMissing =
      session.refundReferenceMissing ??
      (session.status === "refunded" && !session.refundId);
    p.refundEvidence = session.refundEvidence ?? null;
    p.payerId = session.payerId;
    p.approvalUrl = session.approvalUrl;
    // A provider-reported failure is itself the guidance for what to do next.
    p.investigation = session.investigation ?? session.providerIssue ?? null;
    for (const op of session.operations) {
      const entry = {
        ...op,
        key: op.id,
        paymentId: p.id,
        participantId: p.participantId,
        version: p.version,
        provider: "paypal-sandbox",
      };
      const index = this.s.operations.findIndex((o) => o.id === op.id);
      if (index < 0) this.s.operations.push(entry);
      else this.s.operations[index] = entry;
    }
    if (["collecting", "ready"].includes(this.s.status))
      this.s.status = this.engine.ready() ? "ready" : "collecting";
    this.engine.persist();
  }
  async execute(p, action, checkout = {}) {
    // Manual reconciliation can resume a checkout whose plan record was saved first, but only
    // while that checkout is still wanted: a settled payment never gets a new PayPal order.
    if (action === "reconcile" && !this.#session(p)) {
      if (
        p.status !== "created" ||
        p.version !== this.s.version ||
        !["collecting", "ready"].includes(this.s.status)
      )
        return;
      action = "create";
    }
    try {
      await this.lab.run(action, {
        id: p.sandboxSessionId,
        amount: p.amount,
        groupPlanId: this.s.id,
        ...checkout,
      });
    } finally {
      this.#sync(p);
    }
  }
  async release(p) {
    await this.#settle(p);
  }
  async recover(p, { retryRefunds = false } = {}) {
    try {
      await this.#settle(p, { refundCaptures: true, retryRefunds });
      if (paymentSettled(p)) {
        delete p.recoveryError;
        this.engine.persist();
      }
    } catch (error) {
      // One unresolved buyer must not prevent other buyers' recovery.
      p.recoveryError = error.message;
      this.engine.persist();
    }
  }
  async #settle(p, { refundCaptures = false, retryRefunds = false } = {}) {
    if (paymentSettled(p)) return;
    // SandboxLab saves its session before any provider write. This is the one
    // owner of the pre-session interruption rule for release AND recovery.
    if (!this.#session(p)) {
      p.status = "abandoned";
      delete p.recoveryError;
      this.engine.persist();
      return;
    }
    this.#sync(p);
    if (refundCaptures || p.status !== "authorized")
      await this.execute(p, "reconcile");
    if (refundCaptures && p.status === "captured") {
      await this.execute(p, "refund");
      return;
    }
    if (refundCaptures && p.status === "refund_failed") {
      // A known failed refund requires an explicit retry with a new request ID.
      if (retryRefunds) await this.execute(p, "refund");
      return;
    }
    if (refundCaptures && ["refund_pending", "refunded"].includes(p.status))
      return;
    if (p.status === "authorized") await this.execute(p, "void");
    else if (["approval_required", "buyer_approved"].includes(p.status)) {
      // This app cannot complete an abandoned checkout after a revision.
      p.status = "abandoned";
      this.engine.persist();
    }
    if (!paymentSettled(p))
      throw new DomainError(
        "A prior payment is unresolved. Reconcile it before changing the plan.",
      );
  }
}
