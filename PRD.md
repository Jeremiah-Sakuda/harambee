# Harambee product requirements

**Version:** 0.1. **Date:** October 3, 2026. **Status:** Proposed MVP; no implementation or validation. See the [shared requirements](SHARED_REQUIREMENTS.md) for shared requirements, timeline, and payment sources.

Harambee helps a group agree on a purchase, approve individual payment holds, and complete a reservation once the final group is committed. Its primary benefit is removing the organizer's need to front the whole cost. AI turns informal preferences into reviewable constraints and proposes feasible revisions when someone leaves.

## Hackathon objective

The goal is to win first place overall in the PayPal AI Hackathon. Prioritize a strong showing across all five equally weighted judging criteria. See [the goal, official judging criteria, and project-specific evidence plan](HACKATHON.md).

## Audience and problem

The primary user organizes a cabin trip for three to eight friends. Participants have different budgets, attendance, and room preferences. Today the organizer must negotiate shares and decide whether to commit money before everyone pays. A participating cabin operator is the merchant and controls reservation inventory.

The hypothesis is that visible commitments and explicit revision approval reduce the organizer's financial exposure and coordination effort. No adoption, conversion, or time-saving result is established. After the hackathon, the first validation step would be talking to recent trip organizers about how often deposits, late payment, or dropouts caused problems.

## Product decisions

- Start with one merchant, one currency, and a small catalog of fixed-price cabin reservations. The merchant receives each participant's payment directly through its configured account. Harambee does not collect into an organizer wallet or add Payouts in the MVP.
- Commitments expire within 48 hours of opening collection. The trip can occur later; this deadline governs booking, not the stay. Long collection periods and reauthorization are stretch scope.
- Every participant in the final roster approves the exact plan version and personal share. Removing a member or changing the booking creates a new version requiring fresh agreement from everyone remaining.
- A booking becomes confirmed only after all required captures and the reservation commit are confirmed. Partial collection requires compensation, not an atomicity claim.
- Pricing is initially a research question. Demo prices are fixture values; any future service fee must be included before approval. The merchant's processing and refund costs belong in the business model.

## Main user journey

1. The organizer chooses a merchant listing, dates, total price, deadline, and invited participants, then pastes a consented chat excerpt or enters preferences manually.
2. AI proposes a structured roster, attendance, room preferences, budget ceilings, and any ambiguities. Each extracted constraint links to its source text. Missing budgets remain unknown.
3. The group reviews the constraints. A deterministic allocator produces a proposal whose shares sum exactly to the disclosed total. Users can edit and approve the allocation rule.
4. Each participant accepts the version and authorizes their share through PayPal checkout. The board distinguishes agreement from a confirmed payment authorization.
5. If someone withdraws before collection is locked, their authorization enters void processing. AI proposes revised options using remaining participants' stated limits. Each affected participant approves any top-up through a new checkout.
6. Once all participants approve and funding is covered, the organizer selects Book. The system locks the version, checks the merchant reservation lease, and captures each payment.
7. On success, the merchant reservation is committed and each person receives their own receipt and the shared booking confirmation. On failure, the group sees what was charged, what is being returned, and what remains unresolved.

## Allocation example

The demo uses four participants and a $600 booking. Initially each approves $150. One leaves; each remaining participant has a confirmed $220 ceiling. The revised proposal is $200 each, requiring a $50 top-up from each. The departing participant's $150 hold is voided.

A second fixture sets one remaining person's ceiling to $170. The allocator must not propose $200 for that person. It can offer a different approved allocation within the others' limits, a $480 alternative if available, or cancellation. A cheaper listing requires approval of the changed booking and its cancellation terms, not just smaller shares.

## Functional requirements

| ID | Requirement and acceptance condition |
| --- | --- |
| H1 | Create a plan with a merchant listing, price, currency, roster, collection deadline, and cancellation policy. Reject a missing price or expired listing. |
| H2 | Extract structured constraints with source references. Contradictory attendance or ambiguous money requests require review before proposal acceptance. |
| H3 | Allocate integer cents with a visible rule and stable rounding. Total shares equal the final price; no declared ceiling is exceeded. |
| H4 | Track separate agreement and financial states for every participant. An approved checkout without confirmed authorization does not count toward funding. |
| H5 | Record revisions and consents immutably. An old plan version cannot trigger capture for a new allocation. |
| H6 | Allow withdrawal until the booking operation acquires its lock. A simultaneous withdrawal either wins before the lock or returns a clear booking-in-progress response. |
| H7 | Obtain explicit approval for increases. Existing holds may cover an unchanged merchant and amount only when reuse is supported and the new plan consent is recorded. Otherwise replace them. |
| H8 | Expiry closes collection and schedules voids. Show each void's confirmed or unresolved result. Late approvals cannot reopen an expired plan. |
| H9 | Reserve inventory with an expiry before capturing. If a reservation expires during payment processing or commit fails, reconcile and compensate all collected payments. |
| H10 | Preserve receipts, provider identifiers, operation attempts, and recovery status. Retry after restart without duplicate capture or duplicate reservation. |

For lower shares, use a supported partial capture and release the remainder, or replace the authorization after explaining possible temporary overlapping holds. Changing the merchant always requires new checkout. The team must prove its selected adjustment strategy during feasibility; it cannot assume that a hold is transferable.

## Payment and reservation states

Plan states are draft, collecting, revision required, ready, booking, confirmed, cancelling, recovery pending, and cancelled. Per-payment states separately record approval required, authorized, capture pending, captured, void pending, voided, refund pending, refunded, failed, and unknown.

The server may enter booking only when the active version is approved by the entire final roster, confirmed authorizations cover the exact total, no withdrawal is pending, and a valid reservation lease exists. It serializes booking and revision operations for that plan.

After a capture failure, stop new captures, reconcile unknown outcomes, request refunds for confirmed captures, and void uncaptured authorizations. Release uncommitted inventory. If the merchant commit timed out, query the reservation before cancelling or retrying. A previously committed reservation must be cancelled before declaring recovery complete. Any unresolved refund or booking cancellation leaves the plan in recovery pending with an operator action. Refund requests do not imply instant money availability.

Post-booking withdrawal follows the merchant's previously disclosed cancellation policy; it does not automatically trigger group rebalancing. Processing fees, any nonrefundable charges, and who bears recovery costs must be resolved before real payments are enabled.

## AI responsibilities and boundaries

AI interprets chat, highlights conflicts, proposes allocation rules, and explains feasible alternatives. Code enforces arithmetic, budgets, roster consent, deadlines, and transaction transitions. The model has no payment credentials and cannot change approved amounts or mark a payment successful.

Chat content is data, including instructions that attempt to override budgets. If the model fails, users can enter constraints and choose an equal or manually adjusted split. Model output must pass a schema validator and deterministic checks before appearing as a viable proposal.

## Experience and data

The three principal screens are plan setup, the commitment board, and booking or recovery. AG Grid is optional for comparing old and proposed shares, approval status, and amount held. On mobile, each participant must be able to approve their own share without navigating a wide spreadsheet. Private budget ceilings should be visible only to their owner and the allocation service unless the owner chooses to share them.

Core records are Plan, PlanVersion, Participant, Constraint, Proposal, Consent, Authorization, FinancialOperation, Reservation, and AuditEvent. Record which consent and version justify each financial operation. Store only consented chat excerpts; delete raw excerpts after 30 days by default while retaining the minimal approved financial record under a separately defined retention policy.

## MVP and exclusions

Must ship: one merchant reservation integration, three to eight participants, constraint review, exact allocation, authorization, approved top-ups, withdrawal, deadline voids, capture recovery, receipts, and an inspectable audit trail. The demo merchant can be a functioning local fixture with clearly labeled inventory and bookings.

Deferred: arbitrary booking sites, travel search, currency conversion, organizer wallets, cross-merchant payments, automatic borrowing, autonomous increased charges, and long-lived authorizations. A second merchant or broad orchestration framework is unnecessary for this release.

## Validation and release gates

All targets below are proposed acceptance thresholds, not measured results.

| Area | Required evidence |
| --- | --- |
| Payment feasibility | Three independent buyers authorize to the same configured merchant; successful booking, withdrawal void, and capture-then-refund work in sandbox. |
| Recovery | Demonstrate partial capture failure, capture timeout, duplicate callback, restart during recovery, inventory expiry, and unknown reservation commit. No duplicate charge or false confirmed booking in these cases. |
| AI usefulness | Freeze 12 briefs: four clear, four ambiguous, four infeasible or conflicting. At least 10 produce a useful proposal or correct request for clarification; no proposal presented as feasible violates a confirmed constraint. |
| Usability | At least four of five target users can distinguish held, charged, and returning money and approve a revision without facilitator intervention. Report all failures and assistance. |
| Responsiveness | Proposed target: a draft proposal within 15 seconds on the named model and hosting configuration. Show progress and a manual fallback on timeout. |

Gate by October 9: prove the merchant money flow and recovery before building a polished board. If inventory integration fails, reduce to one working local merchant reservation service and label it clearly. If payment recovery cannot be demonstrated, do not claim that Harambee safely completes group bookings.

## Demo and judging plan

The 2:45 video spends 20 seconds on the organizer's problem, 35 on interpreting constraints and approvals, 45 on the dropout and top-ups, 35 on sandbox captures and the reservation receipt, and 30 on a separately labeled failed-capture recovery case. Some initial approvals can be prepared in advance and labeled; show at least one checkout functioning.

Implementation evidence is payment coordination and recovery. Design evidence is the understandable commitment board. Impact is the case for the problem (one friend fronting the cost and absorbing dropouts), the audience, and a demo that visibly removes that risk. Innovation is agreement revision tied to explicit financial consent. Presentation must show the actual booking state and payment evidence, not only animated totals. The most relevant optional award is AG Grid when the comparison board materially benefits from it.

## Unresolved decisions

Select the merchant or fixture operator; validate reservation cancellation behavior; agree on allocation fairness; test replacement versus partial-capture behavior; measure fees and recovery exposure; and choose a model based on the frozen briefs. These decisions gate real-money launch, not creation of the sandbox prototype.
