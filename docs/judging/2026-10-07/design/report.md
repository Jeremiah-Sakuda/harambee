# Harambee — independent product/design judging

Review date: October 7, 2026. Judge: design. Pinned source: `4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b`, inspected only at `/private/tmp/paypal-judging-20261007-harambee-4ed2d00`. This is a simulated independent panel assessment, not an official score or prize prediction.

## Method and boundaries

I read this panel's rubric and manifest, the UI/UX Pro Max skill, and assigned snapshot files. I operated the isolated application at `http://127.0.0.1:3701` with native `mcp__cua_repl` browser control. Initial desktop viewport was 1280×720; a documented browser viewport capability then enabled 375×812 testing. I inspected screenshots, accessibility snapshots, and read-only DOM geometry, and used real buttons and forms for all mutations. I exclusively controlled the assigned simulated UI state. The browser viewport was reset and the temporary tab closed at the end.

I also read three private current submission drafts copied by the coordinator into `review-supplement/`. Those supplements are outside the pinned commit, not public submission evidence, and are considered plans only. No historical judging/remediation files, original repository, sibling projects, other reviewers' reports, secrets, or live provider calls were accessed. References below are verified snapshot-relative `path:line` anchors. The supplemental references deliberately carry the `review-supplement/` prefix.

The manifest reports a clean dependency install and successful build; I did not independently repeat those checks or run the technical suite. Recorded PayPal and model files are submitted evidence, not provider execution by this reviewer. I did not verify public GitHub visibility or the competition website; the supplied panel rubric is the scoring contract. No current video file was found in the assigned snapshot, and the current drafts still show a video placeholder. Formal screen-reader testing, full keyboard traversal, contrast measurements, 200% zoom, real device testing, separate-browser participant polling, external checkout, and all fault variants remain unverified. Screenshots were inspected through the browser tool; they are not saved report attachments.

## Scores

| Criterion | Score / 10 |
| --- | ---: |
| Technological implementation | 8.0 |
| Design | 7.5 |
| Potential impact | 6.5 |
| Innovation / idea | 7.5 |
| Presentation | 5.5 |
| **Equally weighted total** | **70 / 100** |

**Technological implementation — 8.0.** The money journey is non-trivial and the interface exposes its safeguards coherently: separate exact-share approvals, version invalidation after withdrawal, release of the departing person's hold, confirmed budget requests, exact additional authorizations, capture only after renewed agreement, and recovery that distinguishes pending refunds from completed returns. My own UI run verified all of those in simulation. Submitted sandbox records show a consistent three-buyer booking with five authorizations, one void, four completed captures totaling $600, and 15 confirmed operations; this supports actual integration depth beyond a payment-button mockup (`docs/evidence/2026-10-04-sandbox-booking/README.md:11`, `:18`, `:30`). The submitted model results and source show a bounded, checked proposal path, and the current UI honestly identifies the offline planner. The ceiling is limited by unrecorded PayPal refund recovery, demo identity rather than authentication, local inventory, and the small incremental model evidence (`README.md:141`, `:148`, `:186`, `:190`). I do not treat the test counts in documentation as independently executed checks.

**Design — 7.5.** This feels like a coherent trip product: a warm illustrated cabin, restrained green palette, legible prominent money amounts, participant board, planning notes, activity trail, and contextual next actions. The most important consent language is concrete: old amount, new amount, already-held money, and precisely what is approved now. Budget confirmation explicitly says that no approval or charge happens yet. The complete revised booking and two-pass recovery were usable through the interface. Mobile board, consent dialog, activity view, and money summary mostly reflow well; however, an important post-confirmation option label causes real horizontal overflow at 375px. Pending-refund messaging and one undersized mobile control need improvement. Labels, native dialogs, visible focus, text statuses, and reduced-motion source support accessibility, but this review does not certify compliance.

**Potential impact — 6.5.** The intended audience is specific—three to eight friends sharing a stay—and the demonstration directly addresses fronting a deposit and renegotiating before booking when someone leaves (`README.md:11`, `:12`, `:17`). The UI successfully shows a participant staying within $170 while others explicitly accept $215, which is a plausible concrete benefit. The benefit is conditional on the group and merchant accepting this workflow, the trip still being changeable, and separate authorizations being operationally useful. There is no observed user evidence or merchant validation; the study protocol says no participants or merchants have been interviewed (`docs/VALIDATION_PLAN.md:3`, `:9`, `:19`). The source clearly treats operator acceptance, fees, and release/refund costs as hypotheses (`README.md:45`, `:49`). I award credit for demonstrated mechanism, not claims of adoption, time savings, or proven fairness.

**Innovation / idea — 7.5.** The strongest contribution is the combined renegotiation mechanism: a changed plan requires fresh version-specific consent, an earlier approval cannot cover a higher charge, exact-difference top-ups preserve existing commitments, and chat-derived limits belong to their owner. The UI makes this combination tangible. The source itself acknowledges prior group-commitment building blocks (`README.md:29`, `:38`, `:41`), so broad novelty is not assumed or independently established here. The model's role is modest but plausible: interpreting uncertain preferences and providing attributable reasons, while code and people determine money. The same headline split is available without a model, and the submitted synthetic baseline is 23/26 useful versus 24–25/26 for recent model runs (`README.md:148`). That weakens an AI-first novelty pitch while strengthening the narrower consent/recovery idea.

**Presentation — 5.5.** The inspectable README leads with a concise problem and audience, tells judges how to run the demo, distinguishes real sandbox records from simulation, and explains the dropout story. The interface itself carries the story, and my run reached both a committed fixture reservation and a fully recovered failure. The private planned script gives a clear under-three-minute sequence and explicitly labels sandbox, sample cabin, and simulated recovery, which is useful preparation (`review-supplement/DEMO_SCRIPT.md:55`, `:74`). It is not a recorded video. The Devpost draft still contains a YouTube placeholder and the checklist marks recording/upload/public playback incomplete (`review-supplement/DEVPOST.md:22`, `review-supplement/CHECKLIST.md:7`, `:25`, `:33`). There is therefore no actual pacing, narration, audiovisual clarity, or public end-to-end pitch to score. Draft stale statements also need reconciliation before publication. Missing submission media is recorded separately from the product's visual quality.

## Independently observed journeys

1. **Initial agreement:** reset/default fixture, four participants at $150 for a $600 cabin. Each Review dialog identified its participant, version 1, private saved $220 ceiling, exact share, and a simulated hold rather than charge. Approving transitioned to that participant's view; returning to Organizer enabled the next participant. After four approvals the summary showed $600 held and 4/4 approved.
2. **Withdrawal and revision:** Organizer withdrew Sam through an explicit confirmation. Sam became “Hold voided,” held funds fell to $450, and booking became unavailable until a new plan. Suggest options produced a clearly labeled “Local planner · not AI.” It offered $170/$215/$215 pending Maya confirmation, the $480 alternative at $160 each with fresh checkouts, and a standard $200 split explicitly flagged as exceeding Maya's unconfirmed chat statement.
3. **Limit ownership:** sending Maya a request left publication disabled. The demo shortcut exposed a clearly labeled participant-answer dialog. Confirming saved the $170 budget without a payment. I separately reset and repeated the request via the header's Maya identity: the request was rendered in Maya's own view, and the confirmation updated Organizer's option. This verifies the intended participant-view interaction, not real authentication or a separate-device invitation system.
4. **Renewed consent and capture:** publication created version 2 with 0/3 approvals and the old $150 holds retained. Maya's dialog showed +$20, $170 total, $150 already held. Jordan's showed +$65, $215 total; Alex's followed the same flow. Booking required the final simulation confirmation. Activity listed six confirmed capture operations ($150×3 plus $20/$65/$65), a committed fixture reservation, and $600 captured with no held remainder. The interface consistently called this simulation.
5. **Recovery:** reset, four initial approvals, select “Refund needs a second recovery,” then book. The second capture failed; the summary showed $150 captured and $450 held. First recovery released all $450 holds, cancelled inventory, and kept $150 captured with $150 refund pending. The activity explicitly said the refund was processing and recovery remained open. The second pass confirmed the same refund operation at attempt 2, changed returned money to $150, and displayed “All settled. No booking.”
6. **375px and keyboard:** board and activity summary initially reported `document.documentElement.scrollWidth === 375`. The 375×812 consent dialog contained the labeled ceiling and a reachable approval button. New trip's control measured approximately 68×26px. Escape dismissed its native dialog. Tab from the first Publish control showed an unmistakable visible focus ring on the next control. After Maya's confirmation deduplicated the revision options, document width became 411px and the long provenance tag was visibly clipped.

## Strengths

- Exact financial consent is a first-class product interaction, rather than a footnote. The $150→$170 / +$20 dialog explains the change in one place (`src/main.jsx:1540`, `:1559`, `:1569`).
- Chat interpretation and authority are separated in the user's mental model. The participant sees the quoted statement and is told confirmation saves a ceiling without charging them (`src/LimitRequest.jsx:46`, `:75`).
- Money status has useful detail: held, captured, pending refund, and returned are separate labeled values, with pending explicitly a subset of captured (`src/main.jsx:1273`).
- The no-credentials experience acknowledges the local planner and payment simulator; source/recorded evidence does not quietly convert a simulation into a provider claim (`src/RevisionOptions.jsx:27`, `README.md:23`).
- Accessible structure has substantive basics: named dialog and close button (`src/main.jsx:1498`), column headers in option tables (`src/RevisionOptions.jsx:285`), named approval progress (`src/main.jsx:1249`), visible focus (`src/style.css:61`), and reduced-motion override (`src/style.css:1778`).

## Prioritized findings

### P1 — Observed: the confirmed-option label breaks the 375px layout

**Evidence:** `src/style.css:2057` lays the heading and tag side by side; `src/style.css:2068` gives the tag `flex: none`; `src/RevisionOptions.jsx:212` generates the long rule-equivalent label. At viewport 375×812 after Maya confirms, the card header had approximately 269.5px usable width, its heading was squeezed to 80.3px and 135px tall, and its tag remained 270.2px wide, reaching x=411. The document's measured scroll width became 411, and the screenshot visibly clipped the tag at the screen edge.

**Reproduction:** use the four-person fixture; withdraw Sam; Suggest options; Send Maya a confirmation request; switch to Maya and confirm $170; return to Organizer at 375px. The first option now says it matches the standard rule, its title wraps into a narrow column, and the provenance label extends beyond the viewport. Initial options before confirmation and the ordinary board fit at 375px.

**Consequence:** the core revision-selection screen loses readable hierarchy exactly when the participant has completed the key confirmation step. This is a real mobile defect, not an inferred breakpoint issue; publication remains possible, so it is not P0.

**Small change:** stack title and provenance on narrow cards, or allow a bounded, shrinkable tag with an accessible full-text treatment. Recheck this exact post-confirmation state at 375px for document width, complete label, and heading readability. UI/UX skill search `badge label wraps` returned the relevant Compact Label Overflow guidance; this finding is grounded in the observed layout rather than a generic checklist.

### P2 — Observed: the recovery action does not explain that the refund is already processing

**Evidence:** after the first recovery in the pending-refund scenario, the money breakdown correctly read $0 held / $150 captured / $150 refund pending / $0 returned. The main summary still read “Booking stopped,” followed by the unchanged “Return money & release holds” action. The pending-specific explanation appeared only in the activity entry. `src/main.jsx:1323` and `:1342` render one generic instruction/action for all recovery states, while `src/main.jsx:1283` contains the accurate pending amount.

**Reproduction:** reset; approve four people; choose Refund needs a second recovery; confirm booking; press Return money & release holds once; inspect the money/action card. Pressing it a second time correctly reconciles the pending refund and closes recovery.

**Consequence:** the system behaves safely, but the primary interaction may suggest initiating a fresh refund rather than checking an existing refund. On mobile, the activity explanation and action card are far apart. This is a clarity issue, not evidence of double refunds.

**Small change:** show “Refund processing — check status” for this state and explicitly say how much remains pending. Preserve the existing recovery operation and safe backend behavior.

### P2 — Observed: New trip is a small mobile touch target

**Evidence:** the visible control measured about 68×26px at 375px. `src/style.css:252` explicitly overrides its minimum height to 26px, despite the global 44px control floor at `src/style.css:51`; its markup is `src/main.jsx:502`.

**Reproduction:** load or reset the fixture at 375px and inspect the breadcrumb's New trip button. Keyboard activation and Escape dismissal worked, so the issue is touch size, not absence of an accessible name or broken navigation.

**Small change:** give the button a 44px minimum hit area while keeping the visual typography compact. This is a skill-recommended touch target, not a claim that a specific WCAG failure was formally audited.

### P1 evidence/presentation gap — Source-inferred: no current public video, and current drafts are not yet a submission

**Evidence:** no video media was found among snapshot files; `review-supplement/DEVPOST.md:22` still contains a video placeholder; `review-supplement/CHECKLIST.md:7` and `:25` leave filming/public upload incomplete. The script is a future shot list (`review-supplement/DEMO_SCRIPT.md:55`), not evidence that all its planned provider steps happened together. Its concluding instructions still mention replacing/removing an old preview (`:84`), although the checklist says that preview was removed (`review-supplement/CHECKLIST.md:27`). The checklist's headline says AI still needs a live run (`:12`) while its subsequent completion item and pinned records say revision-model runs exist (`:18`, `README.md:141`).

**Consequence:** a judge can run the product, but cannot assess an actual timed end-to-end audiovisual pitch or public submission. Stale checklist statements can also cause an inaccurate final narrative. These are completeness/evidence gaps; they do not erase the functioning product.

**Small change:** reconcile the drafts with the current evidence, then record and publish the planned journey under three minutes. Show an actual model-supported reason or clarification that a basic split cannot supply, show a matching sandbox capture record, and label any recovery simulation. Do not narrate a real refund unless that separate provider run has been recorded.

### P2 evidence gap — Source-inferred: user comprehension and model advantage remain hypotheses

**Evidence:** `docs/VALIDATION_PLAN.md:3` reports no completed research. `README.md:148` reports the identical headline split from the local planner and only a small synthetic model advantage. The private script includes the no-amount preference to illustrate model interpretation, but no completed observed study supports reduced effort or better comprehension.

**Small change:** observe one three-person group perform confirmation, top-ups, and pending-refund recovery without coaching, and compare one genuinely ambiguous brief with the local planner. Record misunderstandings and corrections rather than extrapolating time savings from synthetic pass counts.

## Stage-one readiness and submission completeness

**Readiness: conditional.** Basic product viability is demonstrated locally: coherent UI, accessible setup instructions, and successful simulated end-to-end booking/recovery. Submitted sandbox records and model outputs support reasonable substantive provider use, with the limitations above. This review did not independently call PayPal or the model. Full submission readiness remains conditional on an actual public video and verified public source access; no official eligibility ruling is implied.

Setup instructions and MIT license are present (`README.md:53`, `:198`, `LICENSE:1`). Public repository URL is documented, but visibility/default-branch currency were not checked. The working local demo and build manifest are inspectable. Public YouTube video, actual playback duration, published Devpost entry, and judge access to the final submitted commit are unverified or incomplete. Hosting is optional under the supplied rubric; lack of hosting is not scored as a product defect. Recorded PayPal refund recovery remains absent, and merchant multiparty/onboarding is a later real-deployment requirement, not an invented hackathon gate.

## Three judge questions

1. On a consented real group chat, what does the model help people decide or clarify that the local planner and one direct question do not—and how much correction is required?
2. When everyone pays more after a dropout, do remaining participants understand and accept the capped allocation, including that a visible share may reveal the ceiling it equals?
3. Will a cabin operator hold dates while collecting several authorizations and own refund/fee support after a partially paid booking, and what evidence from that operator changes the product assumptions?

## Smallest credible next step

Fix and recheck the exact 375px post-confirmation label overflow, then record the current end-to-end journey with a real model reason and the already-supported sandbox payment path. Keep recovery explicitly simulated unless separately recorded against PayPal. Publishing that short, captioned video with a verified repository link closes the largest immediately actionable presentation gap; one uncoached group session would then provide the first evidence for the impact story.
