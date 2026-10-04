# Harambee — round-two panel assessment

**53.8/100**, averaging four independent mock judges (individual totals 49–56). Simulated assessment of commit `b2cacab` plus the uncommitted working tree on October 3, 2026 (closed-trip dialog guard, `docs/ROUND2_QA.md`, `docs/demo/`). Not an official result or prize prediction.

## Why the number fell from 61.7

The product improved since round one. The panel credited the integrated group-sandbox coordinator, preserved ceilings, honest two-pass recovery, mobile cards and the frozen 21-case evaluation. The total fell for three reasons:

1. **Stricter rubric.** This round's [rubric](RUBRIC.md) told judges to calibrate against a competitive field, where winners typically show live sandbox payments and visible AI in the video.
2. **A fourth, time-boxed Presentation judge** (49).
3. **The demo video now exists and was judged.** Round one judged a script. Now judges saw six stills that never show PayPal, the model, a dropout or a successful booking.

Treat this as a harsher, more realistic lens, not a regression.

## Scorecards

Scores were recorded before any judge read the prior panel's scores. No judge saw another round-two report.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical / PayPal + AI](technical.json) | 5.0 | 7.0 | 5.5 | 6.5 | 4.0 | 56 |
| [Product / Design](design.json) | 5.0 | 6.5 | 5.5 | 6.0 | 4.5 | 55 |
| [Impact / Innovation](impact.json) | 5.5 | 7.0 | 5.0 | 6.0 | 4.0 | 55 |
| [Presentation / Devpost](presentation.json) | 4.0 | 6.0 | 5.0 | 5.5 | 4.0 | 49 |
| **Panel mean** | **4.9** | **6.6** | **5.3** | **6.0** | **4.1** | **53.8** |

All four judges rated Stage-One readiness **conditional**, with medium confidence. Each judge's full narrative report was returned to the moderator rather than saved, because subagent writes of report files were blocked. The findings below are the moderator's consolidation of those reports.

## Consensus

- **What every judge would protect:**
  - Versioned consent: old approval never covers an increase, and a top-up is a separate authorization for just the extra amount.
  - Private-ceiling capped allocation.
  - "Unknown is not failure" recovery that never re-charges.
  - The held / captured / refund-pending / returned vocabulary.
  - Scrupulous labeling of what is simulated.
- **Biggest gap, raised by all four:** nothing has run against PayPal or a model. Judges read "implemented with provider doubles" as unverified. Technology is the first tiebreaker and scored lowest after Presentation.
- **Second gap, raised by all four:** the video is edited stills with synthesized narration. It reads like a remediation changelog, ends on "All settled. No booking.", and has no public URL.

## Findings, prioritized

No judge assigned a P0. The simulated core works end to end in the browser.

| Pri | Finding | Status | Smallest fix |
| --- | --- | --- | --- |
| **P1** | **A live sandbox booking can never succeed.** `server/paypal.mjs:30-38` sends no `Prefer` header. PayPal Payments v2 capture/refund default to a minimal `{id,status,links}` body, yet `server/sandbox-lab.mjs:209-218` checks `r.amount`. The first buyer is captured at PayPal, marked unknown locally, and the booking aborts and refunds. There is no double charge. The tests miss this because the mocks return full objects. | Moderator re-ran the mock repro ([R1](technical-repro/r1-minimal-capture.mjs)). PayPal default behaviour is from its docs; not run live. | Send `Prefer: return=representation` (or GET after each write). Add a contract test using the minimal response shape. **Do this before the first real sandbox run.** |
| P1 | **Plans can get stuck forever.** A share under $1 or over $500, or an order-create timeout, leaves a payment that cannot be revised, withdrawn, recovered or reset ([R2](technical-repro/r2-out-of-range-share-wedge.mjs), [R6](technical-repro/r6-create-timeout-wedge.mjs)). | Observed with mocks | Validate the amount before persisting. Let release abandon sessions that have no provider ID. Recover a create timeout by re-POSTing with the same `PayPal-Request-Id`. |
| P1 | **Consent dialog leaks state.** `review()` (`src/main.jsx:175`) never clears `notice`, so Jordan's dialog shows Maya's "agreement recorded" message. One `busy` flag makes "Save budget only" relabel the Approve button "Recording your approval…". | Observed in browser; moderator confirmed in source ([shot](design-shots/05-jordan-dialog-stale-approval-notice.jpg), [shot](design-shots/03-save-budget-shows-recording-approval.jpg)) | Clear notice and error on open and close. Use separate busy states. |
| P1 | **The consent sentence is the least legible text on screen.** `dialog .terms` is 10px #7c886b, about 3.6:1 contrast (`src/style.css:1154`). It beats the mobile 14px `.terms` rule on specificity, so phones also get 10px. About 90 declarations are at 7–10px. Agree disables silently. | Observed; moderator confirmed specificity | 14px+, AA contrast, a ~12px floor, and an inline reason when Agree is disabled. |
| P1 | **The AI cannot add a number the regex didn't already find.** Model amounts are overwritten whenever they disagree with line grounding (`server/ai.mjs:139-151`): "two hundred dollars, tops" becomes null ([R7](technical-repro/r7-ai-value-ceiling.mjs)). The PRD's AI-proposed revisions are not built, and the video shows "Local parser · no model key configured". | Observed with a stubbed model | Give the model work a form can't do: word amounts, roster attribution, or natural-language dropout options verified by code. Validate the quoted span instead of overwriting. Run `npm run eval:live -- --write` once. |
| P1 | **Video and README bury the pitch.** Narration runs ~155 wpm with "now preserves…" changelog lines. Captions carry only scene titles, so a muted viewer gets nothing. The README never states the problem or audience in plain words, has no video link, and opens with a 70-word caveat. | Observed | See the shot list below. Move caveats into a "Status & limits" section. |
| P1 | **Positioning is missing.** Airbnb Split Payments (2017, reportedly withdrawn 2018), PayPal Money Pools (relaunched 2024), and Lodgify, Guesty and SPLT split links already let each person pay their share. Harambee's distinct piece is versioned re-consent bound to *holds* plus capped private budgets. Orders set no `payee`, so the merchant-of-record and payer question is open. | Sourced by the impact judge (URLs in its report) | Add one section on what this is not, why the 48h window fits PayPal's 3-day honor period, and a merchant-of-record hypothesis. |
| P2 | Sandbox booking skips the `ready` status check ([R3](technical-repro/r3-book-while-revision-required.mjs)). A duplicate-buyer hold has no release path (R4). A request ID is reused after a definite 4xx (R5). There is no `return_url`/`cancel_url`. The model call runs inside the global mutation lock. | Observed with mocks / source | Align the two coordinators; minor hardening. |
| P2 | There are no per-person receipts, despite the copy "View each person's receipt below". In the failure case the totals show $450 of $600 with no explanation ([shot](design-shots/12-failure-board-450-of-600.jpg)). Participant view still shows Review on other people's rows. Demo scaffolding sits above the hero. | Observed | Add receipt cards, consumer money terms, totals that always sum to the trip price, and own-row-only actions. |

## Proposed 2:45 video

From the presentation judge, endorsed by the others. Record a continuous screen capture with burned-in captions at ~130 wpm:

1. **0:00 Hook:** "one friend puts $600 on their card."
2. **0:10 Idea:** "nobody's charged until everyone's in."
3. **0:22 Live AI:** a draft with source quotes and a clarification.
4. **0:45 Live PayPal sandbox:** authorization for Maya.
5. **1:10 Dropout:** void, version 2, and a delta top-up through a second checkout.
6. **1:40 Book:** capture IDs, split-screen with the sandbox dashboard.
7. **2:02 Recovery:** ≤20s of a failure scenario.
8. **2:25 Close:** "Less chasing. More going."

Keep gaps out of the video; they belong in the Devpost "What's next" section. Without credentials, record the same arc live in the simulator. The judges expect Presentation to cap around 6 in that case.

## Recommended order

1. Fix the `Prefer` header and the stuck states (R1, R2, R6).
2. Run one real three-buyer sandbox group: authorize, then withdraw/void, two top-ups and capture, plus one forced-failure refund. Then run `eval:live` once.
3. Fix the consent dialog (notice, busy, legibility).
4. Record the live video, publish it publicly, and link it at the top of a rewritten README.
5. Add the positioning section, and if time allows, five organizer conversations and one cabin-operator conversation.

The judges estimate steps 1–4 move Technology, Presentation and Impact together. That is the path past the mid-50s.

## Method and limits

- **Snapshot:** a frozen working-tree snapshot with `node_modules` symlinked (not a clean install).
- **Environment:** an isolated production server on port 3501 with no credentials. The technical judge also used its own instance on port 3599.
- **Commands run:** `npm test` 37/37, `npm run eval` 21/21, build OK.
- **Design judge:** operated every README walkthrough flow on desktop and a 375px viewport, with 20 screenshots (7 kept here).
- **Impact judge:** did web landscape research.
- **Presentation judge:** reviewed all 29 extracted video frames plus the transcript, captions and audio levels.
- **Not done:** no live PayPal or model calls, and no user research.
- **Incident:** the port-3501 server exited once mid-session with no logged error. The design judge restarted it; the cause is unverified and it was not reproduced as an app defect.

**Reproductions:** run `node docs/judging/2026-10-03-round2/technical-repro/r1-minimal-capture.mjs` from the repo root. Set `HARAMBEE_DIR` to target another checkout. These scripts assert the *existence* of the defects at this snapshot, so they are not a regression suite.

## Post-review status (October 4, 2026)

The scores above remain the panel's assessment of the reviewed snapshot. Later changes:

- **Fixed:** R1 (`Prefer: return=representation`, plus a lookup if an amount is missing), R2/R6 (amount validated before persistence; create timeouts replay the same `PayPal-Request-Id`; payments without a provider session can be released), R3 (sandbox booking requires a non-revision status), R4 (a duplicate buyer's hold is voided automatically), R5 (a definite 4xx retries with a fresh request ID). PayPal checkout now returns buyers to their participant view. Regression tests were added for each. The reproduction scripts here intentionally still describe the old behavior.
- **Demonstrated:** a [real PayPal sandbox group booking](../../evidence/2026-10-04-sandbox-booking/README.md) with three buyers, one dropout and void, two top-ups, and $600 captured.
- **Still open:** live model run, consent-dialog fixes, recorded public video, positioning section, user/merchant evidence.
