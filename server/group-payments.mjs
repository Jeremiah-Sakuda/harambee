import { randomUUID } from "node:crypto";
import {
  DomainError,
  allocate,
  assertExpectedShares,
  catalog,
} from "./domain.mjs";
const need = (ok, message) => {
  if (!ok) throw new DomainError(message);
};
import {
  PaymentLifecycle,
  paymentSettled as terminal,
} from "./payment-lifecycle.mjs";
// One coordinator per persisted plan. HTTP serializes all mutations across await boundaries.
// PayPal sandbox is an alternate execution path for the same versions/consents/allocations.
export class GroupPayments {
  constructor(engine, lab) {
    this.engine = engine;
    this.lifecycle = new PaymentLifecycle(engine, lab);
  }
  get s() {
    return this.engine.state;
  }
  async approve(actor, version, { appUrl } = {}) {
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
    // Validate before persisting so a rejected amount can never strand a payment record.
    need(
      share - held <= 50000,
      "PayPal sandbox checkouts are limited to $500 per buyer. Choose a cheaper plan or add participants.",
    );
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
      await this.lifecycle.create(
        { participantId: actor, version, amount: share - held },
        {
          appUrl,
          description: `${this.s.title} · ${person.name} · version ${version}`,
        },
      );
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
    await this.lifecycle.execute(p, "authorize");
    await this.distinctBuyer(p);
    this.s.status = this.engine.ready() ? "ready" : "collecting";
    this.engine.persist();
  }
  // Every hold that becomes authorized, by checkout return or by reconcile, must be its own buyer's.
  async distinctBuyer(p) {
    if (p.status !== "authorized") return;
    const shared =
      !p.payerId ||
      this.s.payments.some(
        (other) =>
          other.participantId !== p.participantId &&
          !terminal(other) &&
          other.payerId === p.payerId,
      );
    if (shared) {
      await this.lifecycle.release(p);
      need(
        false,
        "Each participant needs their own sandbox buyer. That buyer already holds another share, so this hold was voided. Approve again and log in with a different sandbox buyer account.",
      );
    }
  }
  async reconcile(actor, paymentId) {
    const p = this.s.payments.find((p) => p.id === paymentId);
    need(
      p && (actor === "organizer" || actor === p.participantId),
      "Only the participant or organizer may reconcile.",
    );
    await this.lifecycle.execute(p, "reconcile");
    if (["collecting", "ready"].includes(this.s.status))
      await this.distinctBuyer(p);
    if (["collecting", "ready"].includes(this.s.status))
      this.s.status = this.engine.ready() ? "ready" : "collecting";
    this.engine.persist();
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
      await this.lifecycle.release(p);
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
    // Check before releasing any real authorization.
    assertExpectedShares(shares, input.expectedShares);
    for (const p of this.s.payments.filter((p) => !terminal(p))) {
      if (
        p.status !== "authorized" ||
        listing.id !== this.s.listingId ||
        e.held(p.participantId) >
          shares.find((s) => s.id === p.participantId)?.share
      )
        await this.lifecycle.release(p);
    }
    e.revise(actor, input);
  }
  async book(actor, { version, fault = "none" }) {
    const e = this.engine;
    e.assertOrganizer(actor);
    if (this.s.status === "confirmed") return;
    e.assertOpen();
    need(
      version === this.s.version &&
        this.s.status !== "revision_required" &&
        e.ready(),
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
    let capturing = null;
    try {
      for (const p of this.s.payments.filter(
        (p) => p.status === "authorized",
      )) {
        need(
          Date.parse(this.s.reservation.expiresAt) > Date.now(),
          "Fixture inventory lease expired. Recovery required.",
        );
        capturing = p;
        await this.lifecycle.execute(p, "capture");
        need(
          p.status === "captured",
          p.status === "capture_declined"
            ? `${p.providerIssue} Recovery required.`
            : "Capture is not confirmed. Recovery required.",
        );
        capturing = null;
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
      // What stopped it, so the board can say so plainly.
      const failing =
        this.s.payments.find((p) =>
          ["capture_declined", "capture_unknown", "capture_pending"].includes(
            p.status,
          ),
        ) ??
        // PayPal rejected the capture outright (a definite 4xx): it's a payment failure, not the cabin's.
        (capturing && capturing.status !== "captured" ? capturing : null);
      this.s.stop = failing
        ? {
            reason: ["capture_unknown", "capture_pending"].includes(
              failing.status,
            )
              ? "capture_unknown"
              : "capture_declined",
            participantId: failing.participantId,
          }
        : {
            reason: /lease expired/i.test(error.message)
              ? "lease_expired"
              : "reservation_failed",
          };
      e.log(`Booking stopped: ${error.message}`, "recovery");
      throw error;
    }
  }
  async recover(actor, { retryRefunds = false } = {}) {
    const e = this.engine;
    e.assertOrganizer(actor);
    // Like the simulator: running recovery again on a settled trip changes nothing.
    if (["cancelled", "confirmed"].includes(this.s.status)) return;
    need(
      ["booking", "recovery_pending", "cancelling"].includes(this.s.status),
      "There is no recovery to run.",
    );
    this.s.status = "recovery_pending";
    e.persist();
    for (const p of this.s.payments.filter((p) => !terminal(p)))
      await this.lifecycle.recover(p, { retryRefunds });
    if (this.s.payments.every(terminal)) {
      this.s.status = "cancelled";
      if (this.s.reservation) this.s.reservation.status = "cancelled";
      e.log(
        "Recovery complete: provider-confirmed refunds and voids; unapproved checkouts closed.",
        "recovery",
      );
    } else
      e.log(
        this.s.payments.some((p) => p.status === "refund_failed")
          ? "Recovery remains open: PayPal reported a refund as failed. Nothing was retried automatically; check the sandbox dashboard, then retry the refund."
          : "Recovery remains open. Reconcile unresolved provider operations; no replacement charges are issued.",
        "recovery",
      );
  }
  // The organizer ends an open trip: every real hold is voided through PayPal, nothing captured.
  async cancel(actor) {
    this.engine.assertOrganizer(actor);
    need(
      ["collecting", "ready", "revision_required"].includes(this.s.status),
      "Only an open plan can be cancelled.",
    );
    this.engine.expireRequests();
    this.s.status = "cancelling";
    this.s.stop = { reason: "cancelled" };
    this.engine.persist();
    this.engine.log("The organizer cancelled the trip.", "recovery");
    await this.recover(actor);
  }
  async expire(actor) {
    this.engine.assertOrganizer(actor);
    need(
      ["collecting", "ready", "revision_required"].includes(this.s.status),
      "Only an open plan can expire.",
    );
    this.s.deadline = new Date().toISOString();
    this.s.status = "cancelling";
    this.s.stop = { reason: "expired" };
    this.engine.persist();
    await this.recover(actor);
  }
}
