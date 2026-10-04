# Harambee — independent technical judge

**Pinned commit:** `7adc9688598caba0f96916b52141a8051620eec8`  
**Persona:** Technical implementation / PayPal + AI judge, independently scoring all five criteria.  
**Repository reviewed:** `/private/tmp/paypal-judge-20261003/harambee`  
**Assessment date:** October 3, 2026 local review session.  
**Overall:** **61/100**. A thoughtfully implemented group-consent simulator with a coherent product shell, meaningful tests, and honest boundaries. The central PayPal-backed group booking and AI usefulness claims remain unproved. This is a mock assessment, not an organizer decision or prize prediction.

## Scope and method

I read the assigned frozen repository, including backend, React flows, tests, README, proposed PRD, recording outline, and its supplied preview. I did not read sibling projects, other judge reports, build conversations, or root summaries. All code references below are repository-relative paths with verified line numbers from this snapshot.

Verified commands:

- `npm test`: **27 passed, 0 failed**; domain, AI mocks, sandbox mocks, and file persistence checks.
- `npm run build -- --outDir /private/tmp/harambee-technical-build`: **passed**, Vite 6.4.3, 1,574 modules, generated JS 267.23 kB / 81.47 kB gzip. Separate output preserved the frozen source's build artifacts.
- `node technical-repro.mjs /path/to/pinned/harambee`: independent in-memory reproductions of interrupted void recovery, sandbox reconciliation/retry inconsistency, AI source/meaning mismatch, and a thousands-separated currency parse error. No network requests occurred; the AI fetch and PayPal client were mocks.
- Viewed `docs/preview.png` and traced the relevant React control paths. The design score is based on this supplied static artifact and source inspection, **not an independently exercised browser session or mobile/accessibility audit**. The repository's manual browser QA report is author-supplied evidence, not my own observation.

Dependencies were reused through the snapshot's `node_modules` symlink; I did not perform a clean `npm ci`. I made no live PayPal/model requests and did not access secrets or mutate the design judge's server/state. Real provider success, webhook behavior, actual merchant inventory, interviews, conversion/time savings, and model accuracy are unverified. The coordinator confirmed that the original GitHub repository is private; no recorded submission video was supplied.

## Independent scores

| Criterion | Score /10 | Principal reason |
|---|---:|---|
| Technological Implementation | 6.0 | Substantial working state machine and adapters, but core group checkout is simulated and recovery has a reproduced crash-boundary hole. |
| Design | 7.5 | Coherent cabin-trip experience, explicit consent, readable commitments and recovery concepts; browser usability not independently verified here. |
| Potential Impact | 6.0 | Specific organizer problem with a credible demonstrated coordination mechanism; payment feasibility and user evidence are missing. |
| Innovation / Idea | 6.5 | Versioned renegotiation tied to financial consent is the strongest distinctive mechanism; AI is currently a peripheral draft extractor. |
| Presentation | 4.5 | Excellent honesty and useful setup/walkthrough materials, but no actual end-to-end video or verified provider demonstration. |
| **Equal-weight total** | **61 /100** | **2 × (6 + 7.5 + 6 + 6.5 + 4.5)** |

### Technological Implementation — 6.0

This is considerably more than a visual mockup. Integer-cent allocation conserves the total and respects ceilings (`server/domain.mjs:42`); booking requires exact current shares, participant consent, and matching held totals (`server/domain.mjs:175`, `server/domain.mjs:353`). Withdrawal, revised allocations, explicit top-ups, cheaper-cabin replacement, expiry, capture interruption, refund processing, and unknown merchant commit are implemented. Stable operation keys and snapshots before simulated execution are sensible architecture (`server/domain.mjs:191`, `server/store.mjs:17`). Tests actually cover important invariants, including rejection of booking after a roster change (`test/domain.test.mjs:206`). All tests and the build pass.

However, the technology criterion explicitly values PayPal plus AI depth. The complete customer journey calls a synchronous simulator; PayPal exists as a separate single-payment lab, acknowledged at `README.md:70`. Its Orders/Payments adapter and request IDs are real source implementation (`server/paypal.mjs:48`), but mock tests are not evidence of a successful provider transaction. The model integration has structured output, timeout, source checks, and no money-moving tools (`server/ai.mjs:69`), yet there is no observed model run or accuracy evaluation. The reproduced unresolved-void completion and sandbox retry inconsistency further limit confidence. A six credits the nontrivial engineering while reserving stronger scores for integrated and demonstrated behavior.

### Design — 7.5

The supplied preview communicates the product quickly: cabin, group, total, held-versus-charged distinction, current version, and a visible simulator banner. The UI uses a consistent visual identity and organizes commitment, notes, and receipts around the same trip. The approval dialog explicitly shows the exact share, additional hold, version, and cancellation terms (`src/main.jsx:1001`). Recovery has a dedicated next action rather than being buried in a generic failure alert (`src/main.jsx:889`). Those are useful product decisions for this problem.

The score is limited by the single-operator demo rather than an observed invitation/multi-participant experience, fixed fixture stay/catalog, and the manual bridge from extracted preferences to personal budget confirmation. A source-inferred budget-prefill issue can also replace an existing private ceiling with the generic $220 default when review starts from Organizer view (`src/main.jsx:171`). I have not independently verified narrow-screen overflow, focus behavior, or all interactive flows; the static preview and code support a strong prototype score but not an exceptional usability claim.

### Potential Impact — 6.0

The audience is precise: a person coordinating a three-to-eight-friend cabin trip, with dropout and fronting-cost concerns (`PRD.md:13`). The simulated $150 initial share becoming an explicitly approved $200 share after withdrawal makes the proposed benefit concrete. Capped allocation and a cheaper alternative address a recognizable coordination decision rather than a vague productivity promise. The implementation demonstrates how agreement and payment status could become visible.

The main practical benefit—avoiding the organizer fronting money—still depends on multiple actual buyers paying the merchant and coordinated reservation completion. Those are unverified. There is no evidence of interviews, observed participant comprehension, reduced coordination effort, merchant willingness, or fee/recovery economics; the repository candidly labels these as hypotheses (`PRD.md:15`, `README.md:54`). The prototype supports a credible potential-impact case, not demonstrated real-world impact.

### Innovation / Idea — 6.5

The most interesting idea is binding a changing group agreement to explicit versions and payment commitments: old consent cannot authorize a higher allocation, and a dropout triggers a revised collective agreement. The combined workflow is clearer and more specific than merely showing a bill split. Holding exact amounts, approving top-ups, and compensating failed collection make the mechanism inspectable in source and tests (`server/domain.mjs:214`, `server/domain.mjs:277`, `test/domain.test.mjs:58`).

I am not claiming market novelty or competitor superiority; no market research was conducted. The currently implemented AI extracts reviewable text and suggested ceilings, while deterministic code performs allocation. It neither proposes structured alternative bookings nor materially drives the revision workflow (`src/main.jsx:692`, `server/domain.mjs:300`). That boundary is good for control, but a stronger innovation score requires showing why a model adds value over manual entry/local parsing on ambiguous real examples, rather than relying on the proposed PRD's broader AI responsibilities.

### Presentation — 4.5

The documentation is unusually clear about what runs, what is simulated, what requires credentials, and what is unverified. Setup instructions, the concrete withdrawal/revision scenario, a useful screenshot, and a compact 2:45 outline provide a good basis for a pitch (`README.md:9`, `README.md:35`, `DEMO.md:3`). Labeling the sandbox lab as separate is a strength, even though it weakens the integration story.

There is no supplied recorded end-to-end demonstration. An outline is not a video, and `DEMO.md:11` explicitly says the recording and live payment/model evidence have not been created. Therefore I cannot assess video clarity, pacing, checkout credibility, or whether a viewer understands holds, revised consent, and recovery unaided. This criterion scores the actual materials rather than a promised recording. The private repository is reported separately as a submission gap; it does not zero unrelated product scores.

## Strengths worth preserving

1. **Explicit consent and exact accounting.** Keep version rejection, exact held-share checks, ceiling enforcement, and top-up-only increases (`server/domain.mjs:175`, `server/domain.mjs:220`, `server/domain.mjs:245`).
2. **Inspectable failure scenarios.** Capture stops on a failure/unknown result, and pending refunds remain visible through a second recovery step in the tested scenarios (`server/domain.mjs:392`, `server/domain.mjs:488`).
3. **Separation of model drafts from money.** No model tool can approve, revise, or capture. Model output remains a draft, and the parser is honestly labeled (`server/ai.mjs:79`, `src/main.jsx:665`).
4. **Honest evidence boundaries.** README distinguishes prototype, mocks, provider integration, and release gates instead of disguising simulation as PayPal success (`README.md:7`, `README.md:70`).
5. **A coherent complete simulated journey.** Approval, dropout, revision, booking, recovery, and evidence export form one understandable product flow, with a production build that succeeds.

## Reproduced findings and prioritized improvements

No P0 is assigned: I did not observe the normal supported demo flow fundamentally broken. These are material gaps or edge cases, not a claim of real funds lost.

### P1 — Connect and demonstrate the group flow through PayPal sandbox

**Observed in source; live result unverified.** The main engine sets simulated authorization and capture results internally (`server/domain.mjs:256`, `server/domain.mjs:396`). The sandbox lab is independent (`server/index.mjs:17`, `server/index.mjs:91`; explicit scope at `README.md:70`). The user's central journey does not exercise PayPal at all.

**Change/evidence:** Bind each participant's approved version and amount to actual sandbox order/authorization IDs; demonstrate three independent buyers, one withdrawal/void, explicit revised top-ups, capture, and one compensating recovery. Keep local lodging fixtures labeled. This directly improves the most heavily relevant implementation evidence without requiring production authentication, distributed storage, or real lodging integration for the hackathon.

### P1 — Do not declare recovery complete with an unresolved persisted void

**Observed in an independent snapshot replay.** `voidPayment` sets `void_pending`, and `operation` persists that state before executing (`server/domain.mjs:269`, `server/domain.mjs:209`). A real saved snapshot can therefore contain plan `cancelling`, payment `void_pending`, and void operation `pending`. On restart, `recover` passes this payment to `voidPayment`, which accepts only `authorized`. The final unresolved-state check omits `void_pending`, then records successful completion (`server/domain.mjs:501`, `server/domain.mjs:504`, `server/domain.mjs:513`).

**Reproduction:** Create a fresh in-memory Engine; approve Maya; record every snapshot during `expire('organizer')`; restore the snapshot with `status === 'cancelling'` and first payment `void_pending`; construct a new Engine and call `recover('organizer')`.

**Actual:** Plan becomes `cancelled`, payment remains `void_pending`, operation remains `pending`, and audit says “unused holds voided.” This is a replay of an actual snapshot emitted by the implementation, not an invented unreachable state. It models a process stop at that save boundary; I did not kill a shared process.

**Change/evidence:** Resume/reconcile pending void operations and keep the plan unresolved until every payment is conclusively voided/refunded. Add crash-boundary tests by restarting from snapshots at each durable transition. Existing restart tests resume after a completed injected booking failure (`test/domain.test.mjs:107`), so they do not cover this boundary.

### P1 — Make sandbox reconciliation consistent with operation history and offered actions

**Observed with a mocked provider; not a verified PayPal incident.** After capture throws a timeout, the operation is `unknown`. Reconciliation reporting the authorization as `CREATED` makes the session `authorized` (`server/sandbox-lab.mjs:77`), but leaves the capture operation unknown. The UI offers Capture for authorized sessions (`src/SandboxLab.jsx:132`), while the backend rejects it at `server/sandbox-lab.mjs:125` and tells the user to reconcile again.

**Reproduction:** Seed an authorized $1 session with order/auth IDs; let mocked `capture` throw; let `getOrder` return that authorization and `getAuthorization` return `CREATED` with the exact amount; run capture, reconcile, capture. Only one provider capture call occurs; the final error is “The previous response is unknown. Reconcile with PayPal before continuing.” Repeating the same reconciliation does not resolve that operation.

**Change/evidence:** Reconcile the durable operation as well as the session. If an outcome is still unknowable, preserve an explicit inspection-required state and suppress Capture. If provider evidence supports safely resuming an existing operation, implement that deliberately using the retained operation ID. Do not solve this by blindly clearing unknown and issuing a new charge.

### P1 — Validate extracted meaning or explicitly mark it unverified

**Observed with a mocked model response.** An exact source quote is only evidence that the text exists. The validator accepts source `Maya: $220 maximum` alongside person `Sam`, `budgetCents: 99900`, `needsReview: false`, and preference `Budget is $999`, returning provider `openai` (`server/ai.mjs:107`). Source inclusion and numeric range are checked; attribution and amount agreement are not. This does **not** move money automatically, which substantially contains the consequence.

**Reproduction:** Replace fetch in a disposable process with a completed structured response containing the fields above; call `interpret('Maya: $220 maximum')`. Actual output retains the mismatched attribution and $999 ceiling. The existing fabricated-source test checks a nonexistent quote, not an accurate quote paired with wrong meaning (`test/ai.test.mjs:71`).

**Change/evidence:** Flag attribution/numeric disagreement and contradictions for clarification, distinguish quote matching from semantic verification, and evaluate clear, ambiguous, negated, and adversarial briefs. Include at least one genuine model run and a scored frozen evaluation set. An extraction draft can stay human-reviewed without implying its meaning was verified.

### P2 — Parse common monetary notation conservatively

**Observed locally.** `interpret('Maya: My maximum is $1,000.')` without a key returns `budgetCents: 100`, `needsReview: false`: $1 rather than $1,000. The regex stops at the comma (`server/ai.mjs:10`), and the ambiguity heuristic does not flag it (`server/ai.mjs:16`).

**Change/evidence:** Either support thousands separators with defined currency grammar or mark unsupported notation as ambiguous with no numeric suggestion. Test `$1,000`, dollar ranges, negated amounts, and multiple people per line. The local path is the default credential-free demonstration, so its draft quality is visible to judges even when no model is configured.

### P2 — Load the participant's existing ceiling before filling the review dialog

**Source-inferred; not independently browser-reproduced.** Organizer projections remove all private budgets (`server/domain.mjs:533`). `review(p)` immediately defaults an unavailable budget to `"220"` while asynchronously switching actor (`src/main.jsx:171`). The subsequent participant state load updates `state` but not the separate `budget` input state (`src/main.jsx:131`). Approval then writes the displayed budget before consent (`src/main.jsx:1049`).

**Reproduction to verify in UI:** Give a participant a $170 ceiling, publish a revision, return to Organizer, and click that participant's Review. Trace indicates the input will show $220 despite their existing $170 ceiling. Clicking approval unchanged writes $220. The displayed value is reviewable, so this is not an invisible unauthorized capture; it is a misleading default at an important consent step.

**Change/evidence:** Fetch the selected participant projection first, then initialize the dialog from that person's stored ceiling. Use an empty required input for genuinely unknown ceilings. Verify the constrained-budget walkthrough retains $170 through role changes and revisions.

### P1 — Produce actual submission and benefit evidence

**Observed materials/coordinator evidence.** No recorded video was supplied, the repository is private, and no live-model/payment or user study result is claimed (`DEMO.md:11`, `README.md:54`).

**Change/evidence:** Publish the intended public source with the existing MIT license and verified setup instructions; record a public YouTube demo under three minutes; include actual sandbox IDs and model mode only when exercised. Run a small observed organizer/participant session focused on whether users distinguish held, charged, and returning amounts and understand a revised share. Report assistance and failures. This improves presentation and impact without pretending a small hackathon study proves market adoption.

## Stage-one and submission readiness

**Mock stage-one readiness: conditional.** The runnable artifact, coherent PayPal/AI theme, nontrivial adapters, and clear setup give a credible basis for consideration. Reasonable use of required APIs is not convincingly demonstrated end-to-end: the core flow is simulated, the PayPal feasibility workflow is separate, and there are no independently verified provider results. Whether this satisfies the organizer's first-stage threshold is the organizer's decision.

Submission checklist, separate from the scores:

- Functional local demo and setup instructions: demonstrated by passing checks and inspectable implemented flow, with no clean-install verification in this review.
- Open-source license: `LICENSE` is present and README identifies MIT.
- Public GitHub repository: **gap**; coordinator confirms current private visibility.
- Public YouTube video under three minutes: **gap**; a script exists, no recording supplied.
- Hosting: not configured; optional under the supplied protocol.
- Sandbox/model success and group-provider integration: **evidence gap**, not creditable merely from mocks.

## Top three judge questions

1. Can three distinct sandbox buyers fund this exact versioned trip, including a dropout, new consent, top-ups, capture, and one refund, with provider IDs visible in the same receipts flow?
2. Which persisted interruption states have you actually restarted from, and how do you guarantee a pending void or unknown capture cannot become a false completed recovery?
3. What measured value does the model add over manual entry or the local parser, and can a participant spot incorrect source attribution or a wrong suggested ceiling before confirming it?

## Smallest credible next iteration

Keep the existing cabin UI and one fixture merchant. First fix unresolved-void completion and the sandbox session/operation inconsistency, with narrowly targeted regression tests. Then connect a three-buyer PayPal sandbox scenario to the existing version/consent engine and record one successful booking plus one compensated failure. Evaluate a small frozen set of extraction notes, including the reproduced amount/attribution cases, and show the actual provider/fallback mode. Finish by recording the concise end-to-end video and making the licensed source public. This is a smaller and more persuasive iteration than adding more listings, integrations, or visual features.

**Confidence: medium.** High confidence in inspected code, passing checks, and isolated reproductions; lower confidence in real-provider feasibility, live browser usability, and impact because those were not observed.

## Preserved reproduction artifact and actual output

`technical-repro.mjs` is preserved beside this report. Run it with Node 22+ against any checkout of the reviewed commit:

```sh
node technical-repro.mjs /path/to/harambee
```

It uses in-memory snapshot replay and mocked providers only. The simulator crash-boundary result does not assert a real PayPal void failed, and the synthetic model response tests the validator rather than alleging an actual model produced that mistake. Actual output from the reviewed snapshot:

```text
CRASH_VOID {"status":"cancelled","payment":"void_pending","operation":"pending","lastAudit":"Recovery complete: captures refunded, unused holds voided, and fixture inventory released."}
UNKNOWN_CAPTURE_AFTER_RECONCILE {"status":"authorized","operation":"unknown","retryError":"The previous response is unknown. Reconcile with PayPal before continuing."}
SOURCE_MATCH_SEMANTIC_MISMATCH {"summary":"Draft","constraints":[{"source":"Maya: $220 maximum","line":1,"person":"Sam","budgetCents":99900,"needsReview":false,"preference":"Budget is $999"}],"provider":"openai","model":"mock","latencyMs":0,"usage":null}
LOCAL_THOUSANDS {"summary":"Review these source-linked preferences before changing the plan. Budget suggestions never change approved amounts.","constraints":[{"source":"Maya: My maximum is $1,000.","line":1,"person":"Maya","budgetCents":100,"needsReview":false,"preference":"My maximum is $1,000."}],"provider":"local-parser","model":null,"latencyMs":0,"usage":null}
```

Latency is incidental and may vary on rerun.
