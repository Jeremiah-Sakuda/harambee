import { randomUUID } from "node:crypto";

export class DomainError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}
const ensure = (v, m, status) => {
  if (!v) throw new DomainError(m, status);
};
export const money = (v) => {
  ensure(
    Number.isSafeInteger(v) && v >= 0 && v <= 10_000_000,
    "Use a valid amount in whole cents.",
    400,
  );
  return v;
};
export const catalog = [
  {
    id: "pine",
    name: "Pine & Still Cabin",
    location: "Catskills, New York",
    total: 60000,
    nights: 2,
    guests: 8,
    policy:
      "Full fixture refund before check-in. No actual lodging is purchased.",
  },
  {
    id: "creek",
    name: "Creekside Hideaway",
    location: "Catskills, New York",
    total: 48000,
    nights: 2,
    guests: 6,
    policy:
      "Full fixture refund before check-in. No actual lodging is purchased.",
  },
];
// Publishing an option must reproduce exactly the shares the organizer reviewed.
export function assertExpectedShares(shares, expected) {
  if (expected === undefined) return;
  ensure(
    Array.isArray(expected) &&
      expected.length === shares.length &&
      shares.every(
        (s) => expected.find((e) => e?.id === s.id)?.share === s.share,
      ),
    "Budgets or the group changed since this option was shown. Refresh the options before publishing.",
  );
}
const provenance = (proposal) =>
  proposal && typeof proposal.title === "string"
    ? {
        title: proposal.title.slice(0, 120),
        source: ["openai", "local-planner", "rule"].includes(proposal.source)
          ? proposal.source
          : "rule",
        model:
          typeof proposal.model === "string"
            ? proposal.model.slice(0, 80)
            : null,
      }
    : null;
export function allocate(total, people) {
  money(total);
  ensure(
    people.length >= 2 && people.length <= 8,
    "Keep between two and eight participants.",
  );
  const caps = people.map((p) =>
    p.budget === null ? Infinity : money(p.budget),
  );
  ensure(
    caps.reduce((a, b) => a + b, 0) >= total,
    "The group’s stated budgets cannot cover this cabin. Choose a cheaper stay or review the budgets.",
  );
  const out = people.map((p) => ({ id: p.id, share: 0 }));
  let remaining = total;
  while (remaining > 0) {
    const available = out
      .map((p, i) => i)
      .filter((i) => out[i].share < caps[i]);
    ensure(available.length, "No feasible allocation.");
    const unit = Math.max(1, Math.floor(remaining / available.length));
    for (const i of available) {
      const add = Math.min(unit, caps[i] - out[i].share, remaining);
      out[i].share += add;
      remaining -= add;
    }
  }
  return out;
}
const timestamp = () => new Date().toISOString();
export function seed() {
  const people = [
    ["maya", "Maya Chen", "MC", 22000],
    ["jordan", "Jordan Ellis", "JE", 22000],
    ["alex", "Alex Rivera", "AR", 22000],
    ["sam", "Sam Taylor", "ST", 22000],
  ].map(([id, name, initials, budget]) => ({
    id,
    name,
    initials,
    budget,
    active: true,
  }));
  return {
    id: randomUUID(),
    title: "A weekend off the grid",
    dates: "November 6–8, 2026",
    createdAt: timestamp(),
    deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
    status: "collecting",
    version: 1,
    listingId: "pine",
    participants: people,
    versions: [
      {
        number: 1,
        createdAt: timestamp(),
        listingId: "pine",
        total: 60000,
        shares: allocate(60000, people),
        reason: "Original plan",
        rule: "Equal shares, capped by confirmed budgets; leftover cents assigned in roster order.",
      },
    ],
    consents: [],
    limitConfirmations: [],
    limitRequests: [],
    payments: [],
    operations: [],
    audit: [
      {
        id: randomUUID(),
        at: timestamp(),
        text: "Demo plan created. The cabin is a local sample listing; payments start in the simulator and can be switched to PayPal sandbox before the first payment.",
        type: "plan",
      },
    ],
    reservation: null,
    fault: "none",
    provider: "simulated",
    ai: null,
  };
}
export class Engine {
  constructor(store) {
    this.store = store;
    this.state = store.load() ?? seed();
    this.state.limitConfirmations ??= [];
    this.state.limitRequests ??= [];
    this.persist();
  }
  persist() {
    this.store.save(this.state);
  }
  log(text, type = "plan") {
    this.state.audit.push({ id: randomUUID(), at: timestamp(), text, type });
    this.persist();
  }
  get current() {
    return this.state.versions.find((v) => v.number === this.state.version);
  }
  get active() {
    return this.state.participants.filter((p) => p.active);
  }
  assertOrganizer(actor) {
    ensure(actor === "organizer", "Only the organizer can do this.", 403);
  }
  sweepExpiry() {
    if (
      ["collecting", "ready", "revision_required"].includes(
        this.state.status,
      ) &&
      Date.parse(this.state.deadline) <= Date.now()
    )
      if (this.state.provider !== "paypal-sandbox") this.expire("organizer");
  }
  assertOpen() {
    this.sweepExpiry();
    ensure(
      ["collecting", "ready", "revision_required"].includes(this.state.status),
      "This plan is no longer open for changes.",
    );
    ensure(
      Date.parse(this.state.deadline) > Date.now(),
      "The collection deadline has passed. Close expired holds first.",
    );
  }
  approved(id) {
    return this.state.consents.some(
      (c) => c.version === this.state.version && c.participantId === id,
    );
  }
  held(id) {
    return this.state.payments
      .filter((p) => p.participantId === id && p.status === "authorized")
      .reduce((s, p) => s + p.amount, 0);
  }
  ready() {
    return (
      this.current.shares.length === this.active.length &&
      this.current.shares.reduce((sum, share) => sum + share.share, 0) ===
        this.current.total &&
      (this.state.provider !== "paypal-sandbox" ||
        this.active.every((person) => {
          const holds = this.state.payments.filter(
            (p) => p.participantId === person.id && p.status === "authorized",
          );
          return holds.every(
            (p) =>
              p.payerId &&
              !this.state.payments.some(
                (other) =>
                  other.participantId !== person.id &&
                  other.status === "authorized" &&
                  other.payerId === p.payerId,
              ),
          );
        })) &&
      this.active.every((p) => {
        const share = this.current.shares.find((s) => s.id === p.id)?.share;
        return (
          p.budget !== null &&
          p.budget >= share &&
          this.approved(p.id) &&
          this.held(p.id) === share
        );
      })
    );
  }
  operation(type, payment, amount, execute) {
    const key = `${this.state.id}:${type}:${payment?.id ?? this.state.version}`;
    const prior = this.state.operations.find((o) => o.key === key);
    if (prior?.status === "confirmed") return prior;
    const op = prior ?? {
      id: randomUUID(),
      key,
      type,
      paymentId: payment?.id ?? null,
      participantId: payment?.participantId ?? null,
      version: this.state.version,
      amount,
      status: "pending",
      attempts: 0,
      createdAt: timestamp(),
    };
    if (!prior) this.state.operations.push(op);
    op.attempts++;
    this.persist();
    execute(op);
    this.persist();
    return op;
  }
  approve(actor, version) {
    ensure(
      this.state.provider !== "paypal-sandbox",
      "Use the sandbox coordinator.",
    );
    this.assertOpen();
    ensure(
      this.state.status !== "revision_required",
      "Publish a revised plan before approving.",
    );
    ensure(
      version === this.state.version,
      "This plan has changed. Review the latest version.",
    );
    const person = this.active.find((p) => p.id === actor);
    ensure(person, "Choose your participant identity before approving.", 403);
    const share = this.current.shares.find((s) => s.id === actor).share;
    ensure(person.budget !== null, "Confirm your budget before approving.");
    ensure(share <= person.budget, "This share exceeds your confirmed budget.");
    if (!this.approved(actor)) {
      this.state.consents.push({
        id: randomUUID(),
        participantId: actor,
        version,
        share,
        listingId: this.state.listingId,
        at: timestamp(),
      });
      this.persist();
    }
    let held = this.held(actor);
    ensure(
      held <= share,
      "Existing holds exceed this share. Replace the holds before approval.",
    );
    if (held < share) {
      const payment = {
        id: randomUUID(),
        participantId: actor,
        amount: share - held,
        status: "approval_required",
        version,
        providerId: null,
      };
      this.state.payments.push(payment);
      this.persist();
      this.operation("authorize", payment, payment.amount, (op) => {
        op.status = "confirmed";
        op.providerId = `SIM-AUTH-${op.id.slice(0, 8)}`;
        payment.providerId = op.providerId;
        payment.status = "authorized";
      });
    }
    this.state.status = this.ready() ? "ready" : "collecting";
    this.log(
      `${person.name} approved version ${version} and authorized their $${(share / 100).toFixed(2)} share (simulated).`,
      "payment",
    );
  }
  voidPayment(payment) {
    if (!["authorized", "void_pending"].includes(payment.status)) return;
    ensure(
      this.state.provider !== "paypal-sandbox",
      "Sandbox holds must be released through the provider coordinator.",
    );
    payment.status = "void_pending";
    this.operation("void", payment, payment.amount, (op) => {
      op.status = "confirmed";
      payment.status = "voided";
    });
  }
  withdraw(actor, participantId) {
    this.assertOpen();
    ensure(
      actor === "organizer" || actor === participantId,
      "You may only withdraw yourself.",
      403,
    );
    ensure(
      this.active.length > 2,
      "A group must have at least two remaining people.",
    );
    const person = this.active.find((p) => p.id === participantId);
    ensure(person, "Participant already left.");
    person.active = false;
    this.state.payments
      .filter((p) => p.participantId === person.id)
      .forEach((p) => this.voidPayment(p));
    this.expireRequests();
    this.state.status = "revision_required";
    this.log(
      `${person.name} left. Their holds were released. Remaining participants must approve a new plan.`,
      "revision",
    );
  }
  revise(
    actor,
    { listingId = this.state.listingId, expectedShares, proposal } = {},
  ) {
    this.assertOrganizer(actor);
    this.assertOpen();
    const listing = catalog.find((l) => l.id === listingId);
    ensure(listing, "Choose an available cabin.", 400);
    ensure(
      this.active.length <= listing.guests,
      "This cabin cannot fit the full group. Choose a larger cabin.",
    );
    const shares = allocate(listing.total, this.active);
    assertExpectedShares(shares, expectedShares);
    const old = this.current;
    for (const p of this.active) {
      if (
        listingId !== this.state.listingId ||
        this.held(p.id) > shares.find((s) => s.id === p.id).share
      )
        this.state.payments
          .filter((v) => v.participantId === p.id)
          .forEach((v) => this.voidPayment(v));
    }
    this.expireRequests();
    this.state.version++;
    this.state.listingId = listingId;
    this.state.versions.push({
      number: this.state.version,
      createdAt: timestamp(),
      listingId,
      total: listing.total,
      shares,
      reason: [
        // Names who left since the last version, so each person sees why their share changed.
        old.shares
          .filter((s) => !this.active.some((p) => p.id === s.id))
          .map(
            (s) =>
              this.state.participants
                .find((p) => p.id === s.id)
                ?.name.split(" ")[0],
          )
          .join(" and ")
          .replace(/^(.+)$/, "$1 left"),
        listingId !== old.listingId
          ? "a different cabin needs a fresh agreement"
          : "shares were refreshed",
      ]
        .filter(Boolean)
        .join("; ")
        .replace(/^./, (c) => c.toUpperCase()),
      rule: "Equal shares, capped by confirmed budgets; leftover cents assigned in roster order.",
      proposal: provenance(proposal),
    });
    this.state.status = "collecting";
    const origin = provenance(proposal);
    this.log(
      `Version ${this.state.version} published${
        origin
          ? ` from the option “${origin.title}” (${
              origin.source === "openai"
                ? `suggested by ${origin.model || "the model"}, verified by code`
                : origin.source === "local-planner"
                  ? "local planner"
                  : "standard rebalance"
            })`
          : ""
      }. Everyone must approve the new allocation before booking.`,
      "revision",
    );
  }
  // Questions about limits belong to one plan version; a new version closes the open ones.
  expireRequests() {
    for (const r of this.state.limitRequests ?? [])
      if (r.status === "pending") r.status = "expired";
  }
  budget(actor, value, { quiet = false } = {}) {
    this.assertOpen();
    const p = this.active.find((p) => p.id === actor);
    ensure(p, "Only participants can update their own budget.", 403);
    const budget = money(value);
    ensure(budget > 0, "Budget must be greater than zero.", 400);
    p.budget = budget;
    // A later edit replaces any limit this person confirmed for a revision option.
    this.state.limitConfirmations = (
      this.state.limitConfirmations ?? []
    ).filter((c) => c.participantId !== p.id);
    if (budget < this.current.shares.find((s) => s.id === p.id)?.share)
      this.state.status = "revision_required";
    if (quiet) return this.persist();
    this.log(
      `${p.name} updated their private budget. Existing consent is unchanged; publish a revision if shares need to change.`,
    );
  }
  // A participant explicitly adopts a limit an option read from their own message. It becomes
  // their saved budget, and only this record (not a budget comparison) unlocks that option.
  // The organizer asks one person, in their own view, to confirm a limit an option read from
  // their message ("confirm") or to give a firm limit where the message was uncertain ("ask").
  requestLimit(
    actor,
    { participantId, kind, amountCents, quote, line, question },
  ) {
    this.assertOrganizer(actor);
    this.assertOpen();
    const p = this.active.find((p) => p.id === participantId);
    ensure(p, "That person is not in the group.", 400);
    ensure(["confirm", "ask"].includes(kind), "Unknown request.", 400);
    const same = this.state.limitRequests.find(
      (r) =>
        r.participantId === p.id &&
        r.version === this.state.version &&
        r.kind === kind &&
        r.amountCents === (amountCents ?? null) &&
        r.status === "pending",
    );
    if (same) return same;
    const request = {
      id: randomUUID(),
      participantId: p.id,
      kind,
      amountCents: kind === "confirm" ? money(amountCents) : null,
      quote: String(quote ?? "").slice(0, 200),
      line: Number.isInteger(line) ? line : null,
      question: String(question ?? "").slice(0, 300),
      version: this.state.version,
      status: "pending",
      at: timestamp(),
    };
    this.state.limitRequests.push(request);
    this.log(
      `The organizer asked ${p.name} to confirm a limit for the revised plan.`,
      "revision",
    );
    return request;
  }
  // A participant explicitly adopts a limit an option read from their own message. It becomes
  // their saved budget, and only this record (not a budget comparison) unlocks that option.
  confirmLimit(actor, amount, requestId) {
    this.assertOpen();
    const p = this.active.find((p) => p.id === actor);
    ensure(p, "Only participants can confirm their own limit.", 403);
    const cents = money(amount);
    ensure(cents > 0, "A limit must be greater than zero.", 400);
    const request = requestId
      ? this.state.limitRequests.find((r) => r.id === requestId)
      : null;
    if (requestId) {
      ensure(
        request &&
          request.participantId === p.id &&
          request.status === "pending",
        "That request is no longer open.",
        409,
      );
      ensure(
        request.version === this.state.version,
        "That request is from an earlier plan.",
        409,
      );
      ensure(
        request.kind === "ask" || request.amountCents === cents,
        "Confirm the amount you were asked about, or save a different budget instead.",
        400,
      );
    }
    // A one-click confirmation of chat the organizer pasted can lower a saved budget, never raise
    // it. Raising it is a deliberate budget edit by the person.
    ensure(
      request?.kind === "ask" || p.budget === null || cents <= p.budget,
      `This would raise your saved budget from $${(p.budget / 100).toFixed(2)}. Use “Update my budget” instead.`,
      400,
    );
    this.budget(actor, cents, { quiet: true });
    this.state.limitConfirmations.push({
      participantId: p.id,
      amountCents: cents,
      // An answer the person typed stays private; the organizer sees only that they answered.
      kind: request?.kind ?? "confirm",
      at: timestamp(),
    });
    if (request) request.status = "confirmed";
    // The amount stays out of the shared log; the organizer sees it on the option they chose.
    this.log(`${p.name} confirmed a limit for the revised plan.`, "revision");
  }
  declineLimit(actor, requestId) {
    this.assertOpen();
    const request = this.state.limitRequests.find((r) => r.id === requestId);
    ensure(
      request &&
        request.participantId === actor &&
        request.status === "pending" &&
        request.version === this.state.version,
      "That request is no longer open.",
      409,
    );
    request.status = "declined";
    const p = this.state.participants.find((p) => p.id === actor);
    this.log(`${p.name} isn’t ready to confirm a limit yet.`, "revision");
  }
  limitConfirmed(id, amount) {
    return (this.state.limitConfirmations ?? []).some(
      (c) => c.participantId === id && c.amountCents === amount,
    );
  }
  book(actor, { version, fault = "none" } = {}) {
    ensure(
      this.state.provider !== "paypal-sandbox",
      "Use the sandbox coordinator.",
    );
    this.assertOrganizer(actor);
    if (this.state.status === "confirmed") return;
    this.assertOpen();
    ensure(version === this.state.version, "This plan version is stale.");
    ensure(
      this.active.length <=
        catalog.find((l) => l.id === this.state.listingId).guests,
      "The cabin cannot fit this group.",
    );
    ensure(
      this.state.status === "ready" && this.ready(),
      "Every participant must approve and authorize the exact current share.",
    );
    ensure(
      [
        "none",
        "capture_failure",
        "capture_timeout",
        "reservation_failure",
        "refund_pending",
        "lease_expiry",
        "commit_timeout",
      ].includes(fault),
      "Unknown demo scenario.",
      400,
    );
    this.state.status = "booking";
    this.state.fault = fault;
    this.state.reservation = {
      id: `SIM-RES-${randomUUID().slice(0, 8)}`,
      status: "leased",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      listingId: this.state.listingId,
    };
    this.log(
      "Booking locked. The local merchant reserved fixture inventory.",
      "reservation",
    );
    const holds = this.state.payments.filter((p) => p.status === "authorized");
    for (let i = 0; i < holds.length; i++) {
      const p = holds[i];
      p.status = "capture_pending";
      this.operation("capture", p, p.amount, (op) => {
        if (i === 1 && ["capture_failure", "refund_pending"].includes(fault)) {
          op.status = "failed";
          p.status = "failed";
          op.error = "Injected simulator decline";
        } else if (i === 1 && fault === "capture_timeout") {
          op.status = "unknown";
          p.status = "unknown";
          op.providerResult = "captured";
          op.providerId = `SIM-CAP-${op.id.slice(0, 8)}`;
        } else {
          op.status = "confirmed";
          p.status = "captured";
          op.providerId = `SIM-CAP-${op.id.slice(0, 8)}`;
        }
      });
      if (["failed", "unknown"].includes(p.status)) {
        this.state.status = "recovery_pending";
        this.state.stop = {
          reason:
            p.status === "failed" ? "capture_declined" : "capture_unknown",
          participantId: p.participantId,
        };
        this.log(
          "Capture interrupted. New captures stopped; recovery is required.",
          "recovery",
        );
        return;
      }
    }
    if (["reservation_failure", "lease_expiry"].includes(fault)) {
      this.state.status = "recovery_pending";
      this.state.stop = {
        reason:
          fault === "lease_expiry" ? "lease_expired" : "reservation_failed",
      };
      this.state.reservation.status =
        fault === "lease_expiry" ? "expired" : "commit_failed";
      this.log(
        "The merchant could not commit the reservation. Captured funds must be returned.",
        "recovery",
      );
      return;
    }
    if (fault === "commit_timeout") {
      this.state.status = "recovery_pending";
      this.state.stop = { reason: "reservation_unknown" };
      this.state.reservation.status = "unknown";
      this.state.reservation.providerResult = "committed";
      this.log(
        "Merchant commit response timed out. Reconcile the reservation before deciding the result.",
        "recovery",
      );
      return;
    }
    this.state.reservation.status = "committed";
    this.state.status = "confirmed";
    this.log(
      "All captures confirmed and local merchant booking committed. Fixture receipts are ready.",
      "reservation",
    );
  }
  recover(actor) {
    this.assertOrganizer(actor);
    if (this.state.status === "cancelled" || this.state.status === "confirmed")
      return;
    ensure(
      ["recovery_pending", "booking", "cancelling"].includes(this.state.status),
      "There is no recovery to run.",
    );
    if (
      this.state.reservation?.status === "unknown" &&
      this.state.reservation.providerResult === "committed"
    ) {
      if (
        this.state.payments
          .filter((p) => p.status === "captured")
          .reduce((a, p) => a + p.amount, 0) === this.current.total
      ) {
        this.state.reservation.status = "committed";
        this.state.status = "confirmed";
        this.log(
          "Reconciled merchant timeout: reservation was committed. Booking confirmed without repeating captures.",
          "recovery",
        );
        return;
      }
      this.state.reservation.status = "cancelled";
    }
    for (const p of this.state.payments) {
      if (p.status === "unknown" || p.status === "capture_pending") {
        const op = this.state.operations.find(
          (o) => o.type === "capture" && o.paymentId === p.id,
        );
        if (op?.providerResult === "captured" || op?.status === "confirmed") {
          p.status = "captured";
          op.status = "confirmed";
        } else p.status = "authorized";
        this.persist();
      }
      if (["captured", "refund_pending"].includes(p.status)) {
        p.status = "refund_pending";
        this.operation("refund", p, p.amount, (op) => {
          if (this.state.fault === "refund_pending" && op.attempts === 1) {
            op.status = "pending";
            op.error = "Simulated provider refund still processing";
          } else {
            op.status = "confirmed";
            p.status = "refunded";
            delete op.error;
          }
        });
      } else if (p.status === "failed") {
        p.status = "authorized";
        this.voidPayment(p);
      } else this.voidPayment(p);
    }
    if (this.state.reservation) this.state.reservation.status = "cancelled";
    this.state.status = this.state.payments.some((p) =>
      [
        "refund_pending",
        "unknown",
        "capture_pending",
        "captured",
        "void_pending",
        "authorized",
      ].includes(p.status),
    )
      ? "recovery_pending"
      : "cancelled";
    this.log(
      this.state.status === "cancelled"
        ? "Recovery complete: captures refunded, unused holds voided, and fixture inventory released."
        : "Refund is still processing. The plan remains in recovery until the provider confirms it.",
      "recovery",
    );
  }
  // The organizer ends an open trip: every hold is released and nothing is charged.
  cancel(actor) {
    this.assertOrganizer(actor);
    ensure(
      ["collecting", "ready", "revision_required"].includes(this.state.status),
      "Only an open plan can be cancelled.",
    );
    this.state.status = "cancelling";
    this.state.stop = { reason: "cancelled" };
    for (const p of this.state.payments) this.voidPayment(p);
    this.expireRequests();
    this.state.status = "cancelled";
    this.log(
      "The organizer cancelled the trip. Every hold was released and nobody was charged.",
      "recovery",
    );
  }
  expire(actor) {
    this.assertOrganizer(actor);
    ensure(
      ["collecting", "ready", "revision_required"].includes(this.state.status),
      "Only an open plan can expire.",
    );
    this.state.deadline = timestamp();
    this.state.status = "cancelling";
    this.state.stop = { reason: "expired" };
    for (const p of this.state.payments) this.voidPayment(p);
    this.state.status = "cancelled";
    this.log(
      "Demo deadline elapsed. Collection closed and remaining holds were voided.",
      "recovery",
    );
  }
  view(actor) {
    const s = structuredClone(this.state);
    for (const p of s.participants) {
      if (p.id !== actor) delete p.budget;
    }
    // Confirmed limits and open requests are visible to their owner and the organizer only.
    const mine = (r) => actor === "organizer" || r.participantId === actor;
    s.limitConfirmations = s.limitConfirmations.filter(mine).map((c) =>
      // A typed answer's amount is the person's own; others see only that they answered.
      c.kind === "ask" && c.participantId !== actor
        ? { participantId: c.participantId, kind: c.kind, at: c.at }
        : c,
    );
    s.limitRequests = s.limitRequests.filter(
      (r) => mine(r) && r.version === s.version,
    );
    s.catalog = catalog;
    s.current = s.versions.find((v) => v.number === s.version);
    s.actor = actor;
    s.aiAvailable = Boolean(process.env.OPENAI_API_KEY);
    return s;
  }
}
