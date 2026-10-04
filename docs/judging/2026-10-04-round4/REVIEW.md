# Harambee — round-four panel assessment

**59.0/100**, the average of four independent mock judges (individual totals 57–61). It assesses commit `e4a02d8` on branch `paypal-sandbox-live`, exported with `git archive`, on October 4, 2026. This is a simulated assessment, not an official result or prize prediction.

**The score is unchanged from round three.** The judges credited the round-three code fixes. The authorize and capture timeouts that left plans stuck are gone, five adversarial repros found no double charge, the dropout-to-options flow is now "the best screen in the product", and the README opening is strong. None of that moves the three things that cap the score:

1. **The video is still the superseded still-image preview.** It shows no PayPal and no AI, and it has no public URL.
2. **The AI has never run against a live model.**
3. **The public GitHub `main` branch is 8 commits behind.** A judge following the repo link sees the old README ("no actual PayPal transaction success is claimed"), and the evidence folder returns 404.

All three need the developer, not more code.

## Scorecards

Each judge recorded their scores before reading any prior panel. No judge saw another round-four report.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical / PayPal + AI](technical.json) | 7.0 | 7.0 | 5.5 | 7.0 | 3.5 | 60 |
| [Product / Design](design.json) | 6.0 | 7.0 | 6.5 | 7.0 | 4.0 | 61 |
| [Impact / Innovation](impact.json) | 6.5 | 6.5 | 5.5 | 6.5 | 4.0 | 58 |
| [Presentation / Devpost](presentation.json) | 6.0 | 7.0 | 5.5 | 6.0 | 4.0 | 57 |
| **Round-four mean** | **6.4** | **6.9** | **5.8** | **6.6** | **3.9** | **59.0** |
| Round-three mean | 6.4 | 6.9 | 5.6 | 6.5 | 4.1 | 59.0 |
| Round-two mean | 4.9 | 6.6 | 5.3 | 6.0 | 4.1 | 53.8 |

All four judges rated Stage-One readiness **conditional**. Full reports were returned to the moderator; this file consolidates them.

## Findings

No judge assigned a P0.

| Pri | Finding | Status | Fix |
| --- | --- | --- | --- |
| **P1** | **The video and public repo don't show the project.** The video is superseded stills with `publicUrl: null`. The public `main` is at `b2cacab`, and `docs/evidence/` returns 404 there. | Observed (GitHub API and raw GETs) | Record and publish the video; merge `paypal-sandbox-live` to `main` and push. |
| **P1** | **No live model run.** All evals report `liveProviderExecuted: false`. The sandbox evidence (`ai: null`) also predates the AI feature, so no single run combines PayPal and AI. | Observed | Run `eval:revisions:live`. Ideally record one sandbox trip that uses a live-model option. |
| **P1** | **The private budget leaks through option rows** ([r1](technical-repro/r1-budget-oracle-rows.mjs)). Previews use other people's saved budgets even when an option depends on an unconfirmed limit. One fabricated line, "Jordan: $1", reveals Maya's exact budget ($234.17) in one request, despite the Activity log and 5-per-version cap. The README undersold this as "reveals something, as a published split does". | Moderator reran the repro | When any limit in an option still needs confirmation, compute the preview from public information only (stated limits and the total). Otherwise show only the split that publishing would produce. Add rows to the privacy test. |
| **P1** | **The sandbox evidence predates the replay and options code** (run on `e8c141e`; `plan.json` has no `limitConfirmations`). Refund recovery against PayPal has still not been run. | Observed | Rerun the sandbox journey on the current commit with one forced failure (real refunds). Stamp the commit SHA in the evidence README. |
| P1 | **Share-change copy is wrong at the edges.** The review dialog compares with the previous *version*, not what the person approved or holds. It says "earlier approval doesn't cover the difference" even when the share goes down. Option rows can read "$170 was $170 · +$20 top-up". A fresh trip shows "+$150 top-up" where it should say "New hold". | Observed in browser | Compare with the person's held amount and last approved share. Write "new hold" or "lower share" wording. |
| P2 | **A 404 on GET order stalls the plan** ([r3](technical-repro/r3-order-404-wedge.mjs)). `getOrder` runs outside the definite-failure path, so withdraw, recovery and reset are blocked. No money is at risk. | Observed with mocks | Treat a definite 404 on an order that was never authorized as abandoned. |
| P2 | **Lost-capture loop** ([r4](technical-repro/r4-lost-capture-replay.mjs)) if PayPal's order omits captures *and* the idempotency key has expired. | Mock; real PayPal behavior unverified | Add a capture lookup fallback and stop replaying after a definite 422. |
| P2 | **Prose checks miss bare numbers** ("140 each", "a hundred and forty", "one-forty", "＄140"), and accept previous-share figures. A consent claim in a model title ("Maya and Jordan already agreed…") becomes stored provenance ([r2](technical-repro/r2-prose-and-provenance.mjs)). | Observed | Reject any digits or number words in model prose. Store a title generated by code, with the model text kept separately as a note. |
| P2 | **Eval option rows still say `"source": "openai"`** for the reference answers, even though the top-level `provider` is now `reference`. | Moderator confirmed (12 rows) | Relabel per option. |
| P2 | Planning notes don't reset on New trip. Two chat readers ("Find the preferences" and "Suggest options") disagree about the same line. The local planner gives Jordan a $100 limit from "Jordan: Maya told me she can only pay $100" (the confirmation gate contains it). A second `complete` call after the PayPal return gives a confusing 409. Text sizes are still 7–11px in the core UI. Participant view can still act for others. The rebalance card silently merges into another card. "Release hold" reads as a button. | Observed | UX and copy fixes. |

## Consensus strengths

- **PayPal payments are hard to double-charge by construction:** request IDs are stored before each call, replay depends on what PayPal reports, and captures use `final_capture:true`. The judges estimate the PayPal integration at about 8/10.
- **The dropout moment is the product's clearest insight:** the quoted chat line, the computed table with top-ups, "Ask Maya to confirm $170", and a Publish button that stays locked until she does.
- **Honest labels everywhere:** "Local planner · not AI", the Real/Simulated table, and an evidence README that says what it does and doesn't show.
- **The sandbox evidence is internally consistent:** 15 operations, matching payer and capture IDs, and plausible timings.

## Innovation and beyond the hackathon (impact judge)

The judge found prior art for *holding funds until the group is in*: Tilt/Crowdtilt (acquired and retired by Airbnb) and Airbnb Split Payments (2017, reportedly withdrawn in 2018). It found no shipping product that renegotiates the deal after a dropout, with fresh consent for the new version and authorization of only the difference.

The two biggest risks to impact are both untested:

- **Dropout timing.** The 48-hour window covers only dropouts before booking.
- **Merchant adoption.** The cabin operator must be the PayPal merchant.

The judge's unscored read matches round three. This is best pursued as a checkout capability, either a PayPal feature or a plugin for direct-booking operators. Bachelor/ette and event-package operators are a sharp first segment. The cheapest experiments:

- interviews on when dropouts happen;
- a hand-run concierge test with 2–3 hosts;
- a landing-page smoke test;
- an AI-versus-one-question-form comparison.

## Recommended order

1. **Merge to `main` and push.** It takes five minutes and fixes what every judge who opens the repo sees.
2. **Run the AI live,** then record a sandbox trip on the current commit that includes a live-model option and a forced-failure refund. Commit both, stamped with the commit SHA.
3. **Record and publish the video** (`submission/DEMO_SCRIPT.md`, which is gitignored).
4. **Close the row-based budget leak,** fix the share-change copy, and fix the per-option eval label. Then the P2 items.

Steps 1–3 are where the remaining points are. Without them, more code changes have not moved the total.

## Method and limits

- **Snapshot:** `git archive` of `e4a02d8`, with no `.env` and no `submission/`. The isolated production server ran without credentials.
- **Technical judge:** ran 62/62 tests, `eval` 22/22, `eval:revisions` 12/12, and the build, and wrote six mock repros.
- **Design judge:** operated the full flow, including a cabin change and a two-pass recovery, at desktop and 375px.
- **Impact judge:** did sourced web research.
- **Presentation judge:** reviewed the video frames and transcript, and checked the public GitHub repo through read-only API calls.
- **Not done:** no live PayPal or model calls, and no user research.

To rerun the repros: `node docs/judging/2026-10-04-round4/technical-repro/<script>.mjs` from the repo root. They assert defects *as of* `e4a02d8`.
