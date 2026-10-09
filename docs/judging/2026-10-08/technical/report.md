# Harambee — independent technical judging, October 8, 2026

Reviewed commit: `0ce5ebecd2b93dfb7dad317c2332a3433f86f973`. Role: technical judge, scoring all five criteria independently. This is a simulated assessment, not an official result or prize prediction. Total: **65/100**. Stage-one readiness: **conditional**. Confidence: **medium overall**, stronger for the reproduced technical behavior than for usability and adoption.

## Method and evidence boundaries

I inspected only the assigned frozen source at `/private/tmp/paypal-judging-20261008-harambee-0ce5ebe`, its rubric, and primary PayPal documentation. I ran `npm test` (113/113 passed), `npm run eval` (22/22 notes cases; all three offline revision evaluators exited successfully), the local-planner baseline (23/26 useful, 26/26 safe), and the no-amount baseline (0/10 useful under the supplied scorer). The offline evaluations test parsers, injected outputs and deterministic verification; they do not reproduce model accuracy.

An independent external [reproduction harness](repro.mjs), using isolated in-memory stores and frozen modules, reran all 16 supplied sandbox matrix scenarios and a separate consent/privacy journey. [Results](repro-results.json) preserve outcomes and a new authorization-mismatch probe. The harness made **zero external provider calls**. No source edits, git actions, secrets, shared UI mutations, or live PayPal/model requests occurred. I did not operate the design judge's browser, test mobile interactions, or personally reproduce the production build. Design judgments use source and submitted screenshots. No current public demonstration video was supplied; future filming receives no credit.

I inspected the submitted October 8 group-refund records and independently compared their five payment-file hashes with the frozen source: all match ([hash evidence](evidence-hashes.json)). The recorded verification is internally consistent with three distinct buyers, three USD 200 captures, three completed USD 200 refunds, and no committed reservation. This is **submitted provider evidence**, not a provider verification performed during my review. Its run did not inject response loss or a restart (`docs/evidence/2026-10-08-sandbox-group-refund/README.md:13`). The separate $1 diagnostic recovery record supports response-loss recovery, with its stated refund-ID audit limitation. The screenshots and AI runs represent separate workflows, accurately identified in `README.md:7`; I do not treat them as one continuously demonstrated live journey.

## Scores and rationale

| Criterion | Score /10 |
| --- | ---: |
| Technological implementation | 8.0 |
| Design | 7.5 |
| Potential impact | 6.0 |
| Innovation / idea | 7.0 |
| Presentation | 4.0 |
| **Total: 2 × sum** | **65/100** |

**Technology — 8.0.** This is a substantial working payment prototype. Integer-cent allocations, version-specific consent, exact top-ups, separate hold/capture/refund states, persisted request IDs, restart recovery and deliberate retry of failed refunds are implemented rather than merely described. I reproduced a dropout, participant-only confirmation of Maya's $170 limit, the $170/$215/$215 allocation, $20/$65/$65 top-ups, stale-version rejection and duplicate-booking protection. The fixture matrix covers meaningful uncertainty and terminal-failure cases. The submitted matching-source group refunds add credible real sandbox depth. The AI uses structured Responses API output, source/speaker/amount checks, confirmation and deterministic allocation; mocked requests excluded saved budgets, used `store:false`, exposed no payment tools and discarded a fabricated cap. A new fail-closed verification gap below prevents an exceptional score. Merchant inventory, seller routing and real identity are transparently outside this local MVP, rather than missing requirements imposed for an enterprise service.

**Design — 7.5.** The submitted screenshots show a coherent cabin, commitment board, option cards and recovery experience, with restrained visual styling and useful state labels. Source connects reviewing a ceiling, saving it, consenting, completing checkout and recovering funds. The approval dialog explicitly distinguishes held funds and top-ups (`src/main.jsx:1626`), makes budget saving separate from approval (`src/main.jsx:1691`), and discloses inference from public shares (`src/main.jsx:1685`). Recovery has an action and monetary state rather than a generic error. The visible demo role selector makes judging practical; separate tab-scoped participant views are still demonstration identities. Dense revision cards and the distinction between verified shares/quotes and model prose need care. I have not independently established keyboard or 375px usability, so those claims are not verified here.

**Impact — 6.0.** The audience and pre-booking problem are specific: friends coordinating a shared stay while avoiding an organizer-funded deposit and renegotiating after a dropout (`README.md:11`). The implemented consent and hold flow plausibly addresses that window. It does not demonstrate saved time, improved completion, reduced interpersonal friction, acceptable capped splits, or merchant willingness. The project explicitly reports no participant research or merchant interview (`docs/VALIDATION_PLAN.md:3`), and fee/adoption hypotheses remain untested (`README.md:49`). Direct payments to actual operators are a proposed deployment path; the prototype pays its own sandbox merchant. PayPal's partner flow requires approval and seller onboarding and uses `payee` to identify the receiving seller, consistent with the disclosed limitation ([PayPal partner authorization documentation](https://developer.paypal.com/platforms/checkout/standard/customize/auth-capture)). I award plausible demonstrated mechanics, without translating them into observed user benefit.

**Innovation — 7.0.** The strongest contribution is the integration of changing group membership, private ceilings, versioned re-consent, difference-only authorizations and recoverable merchant checkout. That combination is visible in executable behavior. Authorize/capture itself is established PayPal functionality ([PayPal authorization documentation](https://developer.paypal.com/v5/checkout/auth-capture)), and the README acknowledges prior group-checkout concepts (`README.md:36`). The model's role is more specific than a generic itinerary assistant: asking about nonnumeric preferences and tying reasons to options. Still, the local planner reproduces the sample's monetary split and most amount-based briefs. The supplied latest live records show 24/26 useful amount-based briefs and 8/10 useful no-amount briefs, under small developer-written evaluations. These support a narrower AI contribution; they do not establish unique market novelty or measured coordination value.

**Presentation — 4.0.** The README gives a clear problem, audience, runnable walkthrough, scope labels and inspection paths. The paired image explicitly separates a live AI run with simulated payments from a recorded sandbox booking. Matching-source refund evidence and honest evaluation caveats make the written package unusually inspectable. However, the actual criterion asks whether the video demonstrates the working journey, and there is no current submitted video (`README.md:93`). Static snapshots and deferred filming preparation cannot establish pacing, narration, transitions, or an end-to-end filmed demonstration. This is a material presentation and submission gap despite the strong written explanation.

## Strengths personally reproduced

- All 113 tests and all 16 fixture matrix scenarios pass, including terminal declined capture, failed refund, explicit refund retry with fresh IDs, lost responses, restart reconstruction and currency/amount mismatch blocking in the covered capture cases.
- The dropout invalidates readiness; an old approval cannot fund a new version. Confirming a chat-read limit requires its owner, and publication recomputes shares from saved ceilings. A repeated successful booking creates no extra capture.
- Organizer/other-participant views omit raw saved ceilings. Limit requests are projected to their owner and organizer. The mocked model request contains names/chat/listings but no saved ceilings, and receives no financial tools.
- Sandbox and simulation are clearly distinguished. Provider uncertainty keeps recovery open, and failed refunds require an explicit retry. Submitted three-buyer group compensation has payment source hashes matching this commit.

## Prioritized actionable findings

### P1 — A rejected authorization verification leaves stale readiness and permits capture

**Observed with an isolated synthetic provider; actual PayPal occurrence unverified.** At `server/sandbox-lab.mjs:154`, reconciliation validates the authorization's amount, but a validation exception does not invalidate or persist the prior `authorized` status. `server/group-payments.mjs:55` synchronizes that session in a `finally`, and `server/group-payments.mjs:29` retains its status. A trip that was ready therefore remains ready after the explicit verification failure. `server/group-payments.mjs:265` accepts that readiness and `server/group-payments.mjs:290` dispatches capture. The adapter sends `{final_capture:true}` without an explicit approved amount (`server/paypal.mjs:99`). The subsequent capture validator does stop booking, but only after the fixture has executed the financial write.

Reproduce by running `node repro.mjs` from this report directory. Its mismatch section (1) approves three $200 holds with the frozen fixture; (2) changes the first fixture authorization's reported amount to USD 199.99; (3) reconciles that payment; and (4) attempts booking. Results: reconciliation throws the expected amount/currency error, but payment is `authorized`, trip is `ready`, and `ready()` is `true`. Booking performs exactly **one capture call**, the fixture records a completed USD 199.99 capture, and only then the application enters `capture_unknown` / `recovery_pending`.

This proves a local fail-closed state gap when authoritative verification fails. It does **not** establish that PayPal can change a valid authorization's amount, that real money was charged, or that the supplied healthy sandbox journeys fail. The P1 priority reflects permitting a financial write after the system has explicitly rejected the resource verification. Persist an unverified/blocked authorization state and clear readiness before propagating the mismatch; retain investigation guidance. Add a regression requiring **zero capture calls** following that reconciliation error.

### P1 — The presentation's required working video is absent

**Observed submission gap.** `README.md:26` and `README.md:93` identify filming as pending. There is no current video to assess; preparation cannot receive demonstration credit. Record and publish the under-three-minute journey with the actual current UI, explicit simulation/sandbox labels, a clearly shown revised approval and result, and a concise recovery example. Avoid implying that recorded AI and PayPal evidence came from one continuous provider run.

### P2 — The claimed AI/user benefit has not been independently established

**Observed evidence limitation, not a broken feature.** `scripts/evaluate-revisions.mjs:113` counts any clarification as useful for ambiguous amount-based cases, without checking its addressee or quality. The stronger no-amount scorer provides useful direction, but its ten developer-written briefs and supplied 8/10 live result do not measure participant effort (`docs/REVISION_OPTIONS.md:68`). The baseline I reran gives the sample's financial split and 23/26 useful amount-based briefs. No user or operator has been observed (`docs/VALIDATION_PLAN.md:3`). The smallest evidence improvement is one observed three-person synthetic trip, comparing local planner and connected model on correction effort, consent comprehension and reaching a decision; separately ask one operator about multiple authorizations and inventory timing. No broad market or savings claim is justified yet.

### P2 — Update the stale release-gate summary to match the new refund evidence

**Observed documentation inconsistency.** `README.md:175` still says multi-buyer compensation after a failed reservation is unrecorded, while `README.md:26` and `docs/evidence/2026-10-08-sandbox-group-refund/README.md:3` provide exactly that record. Replace the stale statement with the remaining boundary: actual three-buyer sandbox compensation is recorded, while declined/pending provider outcomes and real operator inventory remain fixture-tested or unimplemented. This prevents judges from discounting earned evidence or mistaking the prototype's actual scope.

No P0 core-flow failure was observed. I do not require production authentication, distributed storage, verified webhooks, or live merchant inventory for this hackathon score. They remain appropriately disclosed future release gates.

## Stage-one readiness and submission completeness

**Conditional.** Basic viability and nontrivial required API use are demonstrated by runnable code, passing local verification and inspectable submitted PayPal/model records. Setup instructions and an MIT license are present. Public repository visibility/current CI were not independently verified by this judge. A public YouTube video under three minutes is missing, so submission completeness is not demonstrated. Hosting is optional under the supplied rubric and is not treated as a gap. The numerical product scores above remain separate from that completeness judgment.

## Three judge questions

1. If an authorization GET fails the approved-amount check, why can the trip still pass readiness, and what persisted state will prevent any capture until the discrepancy is resolved?
2. On real consented trip briefs, does the model reduce correction and decision effort compared with the local planner, especially for requests such as “I can stretch a bit” that provide no amount?
3. Will a cabin operator accept multiple held shares and a brief inventory lease, and who bears fees or support work when captures succeed but the reservation fails?

## Smallest credible next step

Fix the failed-authorization-verification state transition and add the zero-capture regression using the retained minimal fixture. Then the existing healthy journey and matching-source refund records provide a credible basis for the deferred filmed demonstration. Interviews and a small observed comparison can follow; neither is represented as completed work here.
