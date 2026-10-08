# Independent technical judge — Harambee

Review date: October 7, 2026. This is a simulated hackathon assessment, not an official score or prize prediction. Pinned commit: `4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b`. The pinned product source inspected was `/private/tmp/paypal-judging-20261007-harambee-4ed2d00`. Protocol and manifest were read from the assigned judging folder. No original checkout, previous judging, remediation, other projects, or other judges' reports were read. The parent later supplied three private current presentation drafts under `review-supplement/`; those were assessed separately as uncommitted plans, not pinned/public artifacts.

**Result: 64/100. Stage-one readiness: conditional.** This is a convincing local prototype with nontrivial versioned consent, an integrated PayPal sandbox coordinator, strong fixture coverage, and an AI verifier that constrains model authority. The existing sandbox booking record provides credible evidence of a real sandbox happy path. The strongest remaining technical weakness is incomplete treatment of terminal provider failure states during recovery. The required video is absent from the supplied snapshot, and public submission access is unverified.

## Method and evidence labels

- **Observed:** independently executed against the pinned source using offline tests, in-memory fixtures, or isolated `/private/tmp` files; or directly inspected artifacts. This does not mean a provider was called.
- **Recorded evidence:** artifacts submitted with the snapshot, assessed for internal consistency. Their live execution was not independently repeated.
- **Source-inferred:** behavior or limits established from code, without a complete independent end-to-end reproduction.
- **Unverified:** provider behavior, real users, real merchant inventory, public visibility, or other facts not demonstrated here.

Ran all native tests and all four offline evaluation sets. Reproduced terminal failure handling through the actual `Engine`, `SandboxLab`, and `GroupPayments` classes with a copied test fixture and mocked provider. Independently reran the no-AI planner against the same 26 briefs and evaluator conditions. Inspected financial consent/recovery, exact amount verification, model inputs and source grounding, budget projection, request persistence, README/PRD, the stored PayPal evidence, and `docs/preview.png`. Source stayed unchanged; no build or dependency installation was performed by this judge because that was assigned to the parent review. The shared UI at port 3701 was not operated or mutated.

No provider calls, keys, secret reads, external posting, or Git mutations. No claim is made that the model or PayPal was reverified. No external market-source verification was performed. At the parent's explicit request I checked primary PayPal Payments v2 documentation solely to establish supported provider-status values; this was a documentation read, not a payment/provider transaction call. Presentation and design scores therefore use the actual available preview, source, and written artifacts, with lower confidence than technical checks. Mobile/browser accessibility and continuous live provider execution remain unverified by this judge.

## Scores and rationale

| Criterion | Score / 10 | Rationale |
| --- | ---: | --- |
| Technological implementation | 7.5 | Substantial implementation with successful fixtures and internally consistent real sandbox records; terminal recovery states and live refund evidence remain gaps. |
| Design | 7.5 | Coherent visual treatment and explicit financial decisions across consent, revision, receipts, and recovery; live interaction/mobile comprehension was not independently assessed here. |
| Potential impact | 6 | Specific audience and credible organizer-exposure problem; no user or merchant observations and only small synthetic AI benefit evidence. |
| Innovation / idea | 7 | A defensible combination around revised commitments and personal top-ups; documentation honestly acknowledges the existing all-or-nothing group-checkout concept. |
| Presentation | 4 | Clear written pitch and useful screenshot/records; no actual video artifact or public YouTube demonstration in the supplied evidence. |

Total is `2 × (7.5 + 7.5 + 6 + 7 + 4) = 64`.

**Technology.** The model does not decide or execute payments. The server computes integer-cent allocations, stores versioned personal consent, issues exact-difference top-ups, verifies provider USD amounts, persists request IDs before dispatch, serializes HTTP mutations, and uses compensation after partial capture. These are substantive, relevant engineering choices for this hackathon. The recorded three-buyer sandbox journey corroborates the integrated happy path beyond mocked API calls. The score stops below exceptional because full terminal provider-state handling is incomplete, actual sandbox refunds/recovery were not recorded, and the optional model's demonstrated incremental value is modest. The local identity switch and fixture inventory are clearly documented prototype limits rather than undisclosed production claims.

**Design.** The preview is visually coherent: the commitment board, changed shares, departed participant, sandbox labeling, and charged/held/refund totals form a readable product. Consent source shows the exact incremental hold beside the new total and already-held amount (`src/main.jsx:1558`), separate budget saving (`src/main.jsx:1622`), and explicit version/share agreement (`src/main.jsx:1586`). Participant limit requests explain that confirmation saves a budget and still requires later share approval (`src/LimitRequest.jsx:75`). This is much more complete than a raw payment proof of concept. This score is provisional from source and screenshot; it does not certify live interaction, narrow-screen layout, assistive-technology behavior, or participant understanding.

**Impact.** Groups of 3–8 friends booking one stay are specific enough to evaluate, and independent authorizations plus reapproval after a dropout directly address the person who otherwise fronts the purchase (`README.md:11`, `README.md:13`, `README.md:17`). The contribution is demonstrated as a mechanism, not a measured outcome. There are no recruited participants or merchant interviews (`docs/VALIDATION_PLAN.md:3`). The seller/platform deployment path, processing costs, and operator acceptance remain hypotheses (`README.md:45`). The model's current synthetic advantage over the local planner is one additional useful brief across 26 in the latest recorded run, without a correction-time study. Those facts limit impact evidence without invalidating the underlying problem.

**Innovation.** The narrower idea—new version, fresh personal consent, and authorization of only the increase after a roster change—is useful and cohesive. Tying source-checked revision suggestions to personal budget confirmation creates differentiation beyond a bill ledger. The README credits prior all-or-nothing checkout and discusses collection, split-booking, and AI-planning alternatives (`README.md:31`). Those market comparisons were not independently verified in this restricted review; the score rewards the implementable combination, not a first-ever claim. Most financial protection comes from conventional authorization and deterministic code, and the AI baseline suggests restraint in presenting the model as the essential breakthrough.

**Presentation.** The README leads with a concrete problem, audience, walkthrough, real-versus-simulated table, and limitations. The sandbox evidence narrative is unusually candid about operator-controlled buyer accounts and fixture reservation (`docs/evidence/2026-10-04-sandbox-booking/README.md:3`, `:35`). **Preview present: `docs/preview.png`. Local video absent.** No `.mp4`, `.mov`, or `.webm` video was found, and no public YouTube demonstration link was found in the reviewed submission documents. The later supplied private presentation draft still has a video placeholder, and its checklist leaves recording/upload incomplete (`review-supplement/DEVPOST.md:22`; `review-supplement/CHECKLIST.md:7`, `:25`). Its detailed 2:45 shot list is useful preparation but was not executed recording evidence (`review-supplement/DEMO_SCRIPT.md:52`). These uncommitted drafts modestly strengthen the planned pitch, not the actual presentation score. The PRD's 2:45 video outline is a proposed artifact, not an actual presentation (`PRD.md:102`). A static successful-booking screenshot cannot establish the required end-to-end video, current AI behavior, or working recovery.

## Verification results

| Check | Observed result | What it proves |
| --- | --- | --- |
| `npm test` | 84 passed, 0 failed, 0 skipped | Fixture correctness across domain, AI, revision, adapter, and group coordinator tests. |
| `node scripts/evaluate.mjs` | 22/22 passed | Local parser and injected-validator behavior; not model accuracy. |
| `node scripts/evaluate-revisions.mjs` | 12/12 useful/safe reference fixtures | Verifier pipeline on hand-written answers, including deliberately unsafe suggestions. |
| Revision `--holdout` | 8/8 passed and safe | Same offline reference-verifier qualification. |
| Revision `--holdout2` | 6/6 passed and safe | Same offline reference-verifier qualification. |
| Current no-AI planner, same briefs/conditions | Useful 10/12 + 7/8 + 6/6 = 23/26; safe 26/26 | Reproduces the submitted baseline on this pinned source. |
| Terminal provider fault fixtures | Recovery remains pending after three passes and persisted restarts | The failure-state mapping defect described below. |
| Confirmation-request persistence fixture | A synthetic chat excerpt appears in the scratch plan JSON | The privacy disclosure mismatch described below. |

Offline evaluation report fields explicitly say `liveProviderExecuted: false`. Evaluations measure the actual verifier using reference fixtures (`scripts/evaluate-revisions.mjs:58`, `:94`, `:144`), not independent natural-language interpretation by a live model. The no-AI misses are `ambiguous-no-amount`, `ambiguous-attendance`, and `h-ambiguous-vague`.

## Existing recorded provider evidence

The October 4 record is internally consistent: three distinct payer IDs; version 1 shares $200/$200/$200; Alex inactive and authorization voided; version 2 shares $300/$300; remaining buyers each have a separate $100 top-up with the same payer IDs as their original holds; four completed captures sum to $600; five sessions contain 15 confirmed operations (five create, five authorize, one void, four capture). Version and consent timestamps precede the final captures. Evidence references: `docs/evidence/2026-10-04-sandbox-booking/plan.json:33`, `:75`, `:117`, `:178`, `:355`; explanation at the corresponding `README.md:9` and `:18`.

I credit this as submitted sandbox booking evidence, not as an independent replay or immutable provider attestation. It demonstrates neither refund recovery against PayPal nor real lodging. The record predates the pinned October 7 source and does not demonstrate that every current feature participated in that run. It is not evidence that AI revision suggestions were used in the sandbox journey.

Recorded round-six model evaluations total useful 25/26 and safe 26/26; round seven totals useful 24/26 and safe 26/26. The latest frozen result records 10/12, with 8/8 and 6/6 on its other sets (`eval/revision-results-live-round7.json:4`, `:6`; corresponding holdout files at the same top-level fields). The committed reports name `gpt-4.1-mini-2025-04-14` and contain per-case model/latency fields. I credit these as inspectable recorded model evidence, subject to their synthetic, developer-authored nature and lack of independent provider replay. The README discloses prior unsafe hedged-limit output, tuning on seen briefs, small samples, and discarded fallback attempts (`README.md:129`, `:135`, `:141`, `:145`). The later safety is largely provided by deterministic enforcement and participant confirmation. Reported model benefit is plausible for questions and explanations, but it does not establish reduced user effort.

## Financial consent, AI grounding, and privacy assessment

**Observed and source-supported strengths:**

- Fresh personal consent binds the current version, exact share, listing, and time; stale version approvals and incomplete funding cannot book (`server/group-payments.mjs:71`, `:97`, `:254`; `server/domain.mjs:225`). Withdrawal invalidates the plan, and revising creates a new version (`server/domain.mjs:347`, `:379`).
- Existing eligible authorizations cover only their already-held amount; new authorization is `share - held` (`server/group-payments.mjs:90`, `:112`). A cheaper or changed cabin can release old holds before new approval (`:238`).
- The adapter uses sandbox only, persisted operation IDs, bounded positive cents, timeout handling, exact USD verification, and full representations (`server/paypal.mjs:2`, `:35`, `:40`; `server/sandbox-lab.mjs:3`, `:233`). Supplied tests exercise lost responses and coordinator/lab save boundaries.
- Recovery stops capture progression, refunds confirmed captures, and releases unused holds while unresolved outcomes keep recovery open (`server/group-payments.mjs:280`, `:300`, `:315`). This correctly avoids claiming atomic capture across buyers.
- Revision model input contains names, roster, catalog, and supplied chat, but no saved private budgets (`server/revision-options.mjs:1007`). Model requests have structured output and `store: false` (`:1005`, `:1021`); payment tools are absent.
- Limits need literal amount grounding, matching speaker/quote, ambiguity checking, and participant confirmation where they determine a preview share (`server/revision-options.mjs:267`, `:304`, `:424`). Pending previews use public stated limits; publishable previews use the deterministic saved-budget allocation (`:388`, `:432`). Server option IDs and recomputation constrain browser tampering (`:862`; `server/domain.mjs:43`).
- Raw budgets are projected only to their owner. Typed clarification answer amounts are hidden from the organizer; ordinary confirmation amounts reflect the chat they already supplied (`server/domain.mjs:764`). Final allocations can still reveal capped budgets, which the consent view explicitly discloses (`src/main.jsx:1618`). The isolated privacy fixture confirmed another participant could not see the request.

**Source-inferred and unverified boundaries:** demo actors are client-selected headers (`server/index.mjs:79`) and are not authentication; this is openly acknowledged (`README.md:186`). The single-process mutation lock and atomic JSON rename do not constitute multi-process transactional storage. Public hosting, durable webhook reconciliation, seller onboarding, real inventory, fee responsibility, and real user outcomes are unverified. The 48-hour collection/deadline mechanism is implemented and tested, but real authorization expiry behavior and PayPal recovery were not called in this review. These are appropriate documented release gates; their absence is not automatically a hackathon P0.

## Prioritized actionable findings

### P1 — Terminal failed refunds / declined captures remain indistinguishable from processing

**Evidence:** independently observed using isolated provider fixtures; source-supported mechanism. Actual occurrence against PayPal is unverified. This is a coverage gap beyond the existing HTTP-422 decline fixture, not a claim that the recorded booking failed. PayPal's primary [Payments v2 capture-status definition](https://developer.paypal.com/api/payments/v2/definitions/capture_status/) includes DECLINED separately from PENDING. Its [official Payments v2 schema](https://developer.paypal.com/api/payments/v2/schema.json) at `components.schemas.refund_status` includes FAILED separately from PENDING, and `refund_status_details` documents incomplete-status reasons. Thus these values are supported provider inputs, not invented status names. The fixture's exact resource relationships and failure timing remain simulated.

`server/sandbox-lab.mjs:113` maps every capture status other than REFUNDED/COMPLETED to `capture_pending`. `:123` maps every non-COMPLETED refund detail to `refund_pending`; write responses have the same binary mapping at `:300` and `:309`. `server/group-payments.mjs:318` attempts a refund only for `captured`, skips retry for `refund_pending`, and cannot release a `capture_pending` session (`server/group-payments.mjs:193`, `:202`). The source has no transition distinguishing terminal failure from continued processing.

**Reproduction:** use the in-memory provider fixture in `test/group-payments.test.mjs:15` through `:90`, copied to `/private/tmp` with imports pointed at the pinned snapshot. Approve three buyers, then force fixture reservation failure after captures. Override `refund` to return a PENDING refund while leaving its capture COMPLETED; override `getRefund` to return the same refund ID and amount with status FAILED. Recreate the engine and lab from their saved stores before each recovery pass. Passes 1, 2, and 3 all leave three `refund_pending` payments, trip `recovery_pending`, and refund-call count fixed at 3. No outcome or specific failed-refund instruction is surfaced. Self-contained copied-fixture runner: `technical/recovery-repro.mjs`; recorded output: `technical/recovery-repro-output.json`. Run `node recovery-repro.mjs` from this report's output directory; its imports target the read-only pinned snapshot. No credentials or network are used.

Second fixture: capture returns an amount-verified capture ID with status DECLINED while its authorization remains CREATED. Recovery voids the other two authorizations but leaves the first `capture_pending` across all three persisted restarts, with “A prior payment is unresolved.” Void-call count remains 2. This establishes the adapter's mapping behavior for documented terminal-status values; it is not a verified live provider response sequence.

**Consequence:** money may remain captured after a definitively failed refund, or a hold may remain open after a declined capture. The UI can continue telling the organizer to reconcile “pending” operations even when the mocked provider has supplied a terminal answer. Conservative blocking is the correct safety stop; the finding is the misleading pending classification and missing actionable resolution path, not a demand to blindly retry an uncertain operation. A manual dashboard/support step may be appropriate, but the known terminal failure and its provider ID/reason should be explicit rather than silently appearing to continue processing.

**Small fix:** distinguish pending, completed, and terminal failure in both write and reconciliation paths; persist the actual provider status and clear support guidance. On a definitely failed refund, permit a deliberate safe retry under a new operation key only after confirming the prior refund did not succeed. On declined capture, confirm the authorization outcome and release the unused hold. Add focused restart fixtures for these branches before broadening real-money claims.

### P1 — Submission presentation evidence is incomplete

**Observed:** `docs/preview.png` is present and was viewed; local video absent. No public YouTube demonstration was supplied in reviewed documents. The proposed video timing at `PRD.md:102` and submission checklist at `HACKATHON.md:59` do not establish an actual artifact.

**Consequence:** the technical source and successful booking screenshot cannot satisfy the rubric's actual end-to-end video criterion or independently show current AI, dropout, new personal consent, checkout, and recovery as one journey.

**Action:** record and link an under-three-minute public video of the current build. Label initial prepared approvals and any simulated recovery. Show at least one actual sandbox checkout, a dropout, personal top-up consent, final provider IDs, and a clearly labeled recovery example. A fresh live refund recording would strengthen technical evidence but is distinct from the required presentation artifact.

### P2 — “Notes never persist” omits persisted source excerpts

**Observed:** a synthetic planning note excerpt persists to a scratch plan file after a confirmation request. `server/revision-options.mjs:915` copies up to 200 characters of the participant's note into the request. `server/domain.mjs:476` stores that quote in `limitRequests`, and `:483`/`:487` persist it via the activity log. Expiring a request changes its status but retains the quote (`server/domain.mjs:427`). `README.md:194` says “notes never persist,” and `README.md:100` states notes/interpretations remain in browser memory.

**Reproduction:** create an isolated `Store` at `/private/tmp/harambee-technical-privacy-plan.json`; seed and approve the demo, withdraw Sam, and request revisions with `Maya: My medical appointment is confidential. My budget limit is $170.` Resolve and issue Maya's $170 confirmation request using the server's batch ID. The resulting JSON contains `My medical appointment is confidential. My budget limit is $170.` in `limitRequests[0].quote`. The repeatable runner and output are `technical/privacy-repro.mjs` and `technical/privacy-repro-output.json`; run `node privacy-repro.mjs` in this report's directory. Jordan's projected `limitRequests` is empty, so this is a persistence/disclosure mismatch, not an observed cross-participant raw-budget leak.

**Action:** describe the distinction between transient full notes and persisted request excerpts; disclose who can see them and how long they remain. Prefer minimizing or redacting the stored quote to the financial statement if retention is unnecessary. Keep the useful source review while making its persistence explicit.

No P0 was found in the exercised core journey. The review does not assert exhaustive defect discovery.

## Stage-one and submission readiness

**Conditional:** the local functional prototype and meaningful PayPal/AI implementations are demonstrated by tests/source, with recorded sandbox and model evidence supporting existing provider use. Setup instructions are concrete (`README.md:49`), dependencies specify Node 22+, and an MIT license exists (`LICENSE:1`).

Submission gaps: actual public video absent; public GitHub URL is documented (`README.md:198`) but public visibility and clone access were not independently checked; judge access duration is unverified. Hosting is optional and its absence alone is not a failure. A current working demo was technically exercised through fixtures; this judge did not operate the shared browser build. Live sandbox failure recovery remains an evidence gap explicitly acknowledged at `docs/evidence/2026-10-04-sandbox-booking/README.md:36` and `README.md:190`.

## Three judge questions

1. If PayPal reports a refund FAILED or a capture DECLINED, what exact participant/organizer message and confirmed next action resolve the trip without a duplicate movement? Can you show that branch across a restart?
2. What does the live model contribute beyond the current local planner's 23/26 useful briefs, and do actual participants need less correction or coordination time when its questions/reasons are present?
3. What current public video demonstrates one buyer's checkout, changed version, personal top-up consent, final sandbox captures, and a labeled recovery example; which seller/inventory assumptions remain fixtures?

## Smallest credible next step

Close the terminal-provider-state gap with two focused persisted-restart fixtures and accurate failed-versus-pending messages, and correct the chat-excerpt persistence disclosure. Then capture a single short, current demonstration and link it from the README. That would directly strengthen financial recovery confidence and presentation readiness without adding features or pretending merchant/user validation has already happened.
