import { randomUUID } from "node:crypto";
import { DomainError, allocate, catalog } from "./domain.mjs";
const need = (ok, message) => {
  if (!ok) throw new DomainError(message);
};
const terminal = (p) => ["voided", "refunded", "abandoned"].includes(p.status);
// One coordinator per persisted plan. HTTP serializes all mutations across await boundaries.
// PayPal sandbox is an alternate execution path for the same versions/consents/allocations.
export class GroupPayments {
  constructor(engine, lab) {
    this.engine = engine;
    this.lab = lab;
  }
  get s() {
    return this.engine.state;
  }
  sync(p) {
    if (p.status === "abandoned") return;
    const session = this.lab.state.sessions.find(
      (s) => s.id === p.sandboxSessionId,
    );
    if (!session) return;
    p.status = session.status;
    p.providerId = session.authorizationId || session.orderId || null;
    p.captureId = session.captureId;
    p.refundId = session.refundId;
    p.payerId = session.payerId;
    p.approvalUrl = session.approvalUrl;
    p.investigation = session.investigation;
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
    this.engine.persist();
  }
  async run(p, action) {
    try {
      await this.lab.run(action, {
        id: p.sandboxSessionId,
        amount: p.amount,
        groupPlanId: this.s.id,
      });
    } finally {
      this.sync(p);
    }
  }
  async approve(actor, version) {
    const e = this.engine;
    e.assertOpen();
    need(
      this.s.status !== "revision_required",
      "Publish a revised plan before approving.",
    );
    need(
      version === this.s.version,
      "This plan has changed. Review the latest version.",
    );
    const person = e.active.find((p) => p.id === actor);
    need(person, "Choose your own participant identity.");
    const share = e.current.shares.find((p) => p.id === actor).share;
    need(
      person.budget !== null && person.budget >= share,
      "Save a budget that covers this exact share first.",
    );
    const unresolved = this.s.payments.find(
      (p) =>
        p.participantId === actor && !terminal(p) && p.status !== "authorized",
    );
    need(
      !unresolved,
      "Finish or reconcile your existing checkout before creating another.",
    );
    const held = e.held(actor);
    need(held <= share, "Release excess holds before approving.");
    if (!e.approved(actor))
      this.s.consents.push({
        id: randomUUID(),
        participantId: actor,
        version,
        share,
        listingId: this.s.listingId,
        at: new Date().toISOString(),
      });
    e.persist();
    if (held < share) {
      const p = {
        id: randomUUID(),
        participantId: actor,
        version,
        amount: share - held,
        status: "created",
        sandboxSessionId: randomUUID(),
      };
      this.s.payments.push(p);
      e.persist();
      await this.run(p, "create");
    }
    this.s.status = e.ready() ? "ready" : "collecting";
    e.log(
      `${person.name} consented to version ${version}, exact share $${(share / 100).toFixed(2)}. Any additional hold requires this buyer’s sandbox checkout.`,
      "payment",
    );
  }
  async complete(actor, { paymentId, version }) {
    const p = this.s.payments.find((p) => p.id === paymentId);
    need(
      p && p.participantId === actor,
      "Only this participant may complete their checkout.",
    );
    this.engine.assertOpen();
    need(
      this.s.status !== "revision_required" &&
        p.version === this.s.version &&
        version === this.s.version &&
        this.engine.active.some((x) => x.id === actor),
      "This consent is stale. Reconcile and release it; review the new version.",
    );
    need(this.engine.approved(actor), "Review the current agreement first.");
    await this.run(p, "authorize");
    need(
      p.payerId &&
        !this.s.payments.some(
          (other) =>
            other.participantId !== actor &&
            !terminal(other) &&
            other.payerId === p.payerId,
        ),
      "Each participant needs a distinct verified sandbox buyer. Release this hold before continuing.",
    );
    this.s.status = this.engine.ready() ? "ready" : "collecting";
    this.engine.persist();
  }
  async reconcile(actor, paymentId) {
    const p = this.s.payments.find((p) => p.id === paymentId);
    need(
      p && (actor === "organizer" || actor === p.participantId),
      "Only the participant or organizer may reconcile.",
    );
    await this.run(
      p,
      this.lab.state.sessions.some((s) => s.id === p.sandboxSessionId)
        ? "reconcile"
        : "create",
    );
    if (["collecting", "ready"].includes(this.s.status))
      this.s.status = this.engine.ready() ? "ready" : "collecting";
    this.engine.persist();
  }
  async release(p) {
    if (terminal(p)) return;
    this.sync(p);
    if (p.status !== "authorized") {
      await this.run(p, "reconcile");
    }
    if (p.status === "authorized") await this.run(p, "void");
    // Orders never authorized by this app carry no hold and cannot be completed after revision.
    else if (["approval_required", "buyer_approved"].includes(p.status)) {
      p.status = "abandoned";
      this.engine.persist();
    }
    need(
      terminal(p),
      "A prior payment is unresolved. Reconcile it before changing the plan.",
    );
  }
  async withdraw(actor, participantId) {
    const e = this.engine;
    e.assertOpen();
    need(
      actor === "organizer" || actor === participantId,
      "You may only withdraw yourself.",
    );
    need(
      e.active.length > 2 && e.active.some((p) => p.id === participantId),
      "Keep at least two remaining participants.",
    );
    for (const p of this.s.payments.filter(
      (p) => p.participantId === participantId,
    ))
      await this.release(p);
    e.withdraw(actor, participantId);
  }
  async revise(actor, input) {
    const e = this.engine;
    e.assertOrganizer(actor);
    e.assertOpen();
    const listing = catalog.find(
      (l) => l.id === (input.listingId || this.s.listingId),
    );
    need(
      listing && e.active.length <= listing.guests,
      "Choose a cabin that fits the group.",
    );
    const shares = allocate(listing.total, e.active);
    for (const p of this.s.payments.filter((p) => !terminal(p))) {
      if (
        p.status !== "authorized" ||
        listing.id !== this.s.listingId ||
        e.held(p.participantId) >
          shares.find((s) => s.id === p.participantId)?.share
      )
        await this.release(p);
    }
    e.revise(actor, input);
  }
  async book(actor, { version, fault = "none" }) {
    const e = this.engine;
    e.assertOrganizer(actor);
    if (this.s.status === "confirmed") return;
    e.assertOpen();
    need(
      version === this.s.version && e.ready(),
      "Every participant must authorize their exact current share.",
    );
    need(
      ["none", "reservation_failure"].includes(fault),
      "In sandbox mode only the local reservation-failure scenario is available.",
    );
    this.s.status = "booking";
    this.s.reservation = {
      id: `FIXTURE-${randomUUID()}`,
      status: "leased",
      listingId: this.s.listingId,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
    e.persist();
    try {
      for (const p of this.s.payments.filter(
        (p) => p.status === "authorized",
      )) {
        need(
          Date.parse(this.s.reservation.expiresAt) > Date.now(),
          "Fixture inventory lease expired. Recovery required.",
        );
        await this.run(p, "capture");
        need(
          p.status === "captured",
          "Capture is not confirmed. Recovery required.",
        );
      }
      need(
        fault !== "reservation_failure",
        "Fixture reservation intentionally failed; refund all captures.",
      );
      need(
        Date.parse(this.s.reservation.expiresAt) > Date.now(),
        "Fixture inventory lease expired. Recovery required.",
      );
      this.s.reservation.status = "committed";
      this.s.status = "confirmed";
      e.log(
        "Every sandbox capture confirmed. Local fixture booking committed; no real lodging was purchased.",
        "payment",
      );
    } catch (error) {
      this.s.status = "recovery_pending";
      e.log(`Booking stopped: ${error.message}`, "recovery");
      throw error;
    }
  }
  async recover(actor) {
    const e = this.engine;
    e.assertOrganizer(actor);
    need(
      ["booking", "recovery_pending", "cancelling"].includes(this.s.status),
      "There is no recovery to run.",
    );
    this.s.status = "recovery_pending";
    e.persist();
    for (const p of this.s.payments.filter((p) => !terminal(p))) {
      try {
        await this.run(p, "reconcile");
        if (p.status === "captured") await this.run(p, "refund");
        else if (!["refund_pending", "refunded"].includes(p.status))
          await this.release(p);
      } catch (error) {
        p.recoveryError = error.message;
        e.persist();
      }
    }
    if (this.s.payments.every(terminal)) {
      this.s.status = "cancelled";
      if (this.s.reservation) this.s.reservation.status = "cancelled";
      e.log(
        "Recovery complete: provider-confirmed refunds and voids; unapproved checkouts closed.",
        "recovery",
      );
    } else
      e.log(
        "Recovery remains open. Reconcile unresolved provider operations; no replacement charges are issued.",
        "recovery",
      );
  }
  async expire(actor) {
    this.engine.assertOrganizer(actor);
    need(
      ["collecting", "ready", "revision_required"].includes(this.s.status),
      "Only an open plan can expire.",
    );
    this.s.deadline = new Date().toISOString();
    this.s.status = "cancelling";
    this.engine.persist();
    await this.recover(actor);
  }
}
