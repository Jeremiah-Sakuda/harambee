# Harambee — round-three panel assessment

**59.0/100**, the average of four independent mock judges (individual totals 56–61). It assesses commit `e3e7593` on branch `paypal-sandbox-live`, exported with `git archive`, on October 4, 2026. This is a simulated assessment, not an official result or prize prediction.

Round two scored **53.8** using the same [rubric](RUBRIC.md) and the same four personas. The gain comes from:

- the [real PayPal sandbox group booking](../../evidence/2026-10-04-sandbox-booking/README.md), which every judge checked for internal consistency;
- the PayPal fixes from round two;
- the new AI revision options after a dropout.

Presentation did not move. The video predates all of this.

## Scorecards

Each judge recorded their scores before reading any prior panel. No judge saw another round-three report.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical / PayPal + AI](technical.json) | 6.5 | 7.0 | 6.0 | 6.5 | 4.5 | 61 |
| [Product / Design](design.json) | 6.5 | 6.5 | 6.0 | 7.0 | 4.5 | 61 |
| [Impact / Innovation](impact.json) | 6.5 | 7.0 | 5.0 | 6.0 | 3.5 | 56 |
| [Presentation / Devpost](presentation.json) | 6.0 | 7.0 | 5.5 | 6.5 | 4.0 | 58 |
| **Round-three mean** | **6.4** | **6.9** | **5.6** | **6.5** | **4.1** | **59.0** |
| Round-two mean | 4.9 | 6.6 | 5.3 | 6.0 | 4.1 | 53.8 |

All four judges rated Stage-One readiness **conditional**, because the public YouTube video is missing. Full narrative reports were returned to the moderator; this file consolidates them.

## Consensus

- **Credited by every judge:**
  - Exact-difference re-authorization after a dropout. The original consent never covers an increase, and this has been shown against real PayPal.
  - Correct Orders v2 AUTHORIZE / Payments v2 usage, with write-ahead request IDs, amount checks and distinct-buyer enforcement.
  - Sandbox evidence that is internally consistent: 15 operations, matching capture IDs and payer IDs, and consent timestamps that precede order creation as the code would produce.
  - AI-proposed options that code verifies and that each person must confirm, with honest labels throughout.
- **The AI has never run against a real model.** Every eval result says `liveProviderExecuted: false`. The keyless demo shows the local planner, which by design does not read "can’t go above $170". As a result, a first-time judge never sees the feature's central moment.
- **The video is stale.** It was recorded at `e28bc2a`, shows no PayPal and no AI, still says provider execution is "pending credentials", and is not public. It is now the largest drag on the score.

## Findings

No judge assigned a P0.

| Pri | Finding | Status | Fix |
| --- | --- | --- | --- |
| **P1** | **An authorize timeout stalls the plan permanently** ([D1](technical-repro/r1-authorize-timeout-wedge.mjs)). Reconcile keeps it `authorize_unknown`. Re-approve, revise, recovery and reset are all blocked. | Moderator reran the repro (mock PayPal) | Replay authorize with the same `PayPal-Request-Id`, as is already done for create. |
| **P1** | **A capture timeout leaves a buyer's hold with no recovery inside the app** ([D2](technical-repro/r2-capture-timeout-wedge.mjs)). The plan stays `recovery_pending` until PayPal expires the authorization. | Observed with mocks | Replay capture with the same key, or void a `CREATED` authorization, which fails definitively if the capture already happened. |
| **P1** | **The organizer can recover a private budget** ([D3](technical-repro/r3-private-budget-oracle.mjs)). The recheck endpoint reveals `budget <= cap`, which allowed binary search to recover $183.37 in 23 calls, with nothing audited. | Moderator reran the repro | Return only "needs confirmation", with no comparison, and rate-limit and audit rechecks. |
| P1 | **Three competing revision actions, and contradictory progress.** The sidebar "Publish revised shares" and the banner "Rebalance" skip the option cards. The sidebar shows "3/3 approved" with a full bar during `revision_required`, and "4/4" after cancellation (`src/main.jsx` `count`). | Observed in browser | Make the option cards the single entry point, and count only current-version approvals while the plan is open. |
| P1 | **The keyless demo hides the insight.** The default chat yields $200 / $200 / $200 under a "stated limits" title. | Observed | Show a plainly worded seeded line, or an honestly labelled recorded model response. Retitle when no limits applied. |
| P1 | **"Ask Maya to confirm" reuses the generic approval dialog.** It shows "version 1 · $150 · $0 additional". Re-approval never says "Sam left; your share went $150 → $170". | Observed | Write purpose-built confirmation and re-approval copy, and keep organizer notices out of participant dialogs. |
| P2 | **The prose-figure check can be bypassed** ([D4](technical-repro/r4-prose-figure-bypass.mjs)). "two hundred sixty dollars", "USD 260" and "90 bucks" pass unchecked into titles, explanations, summaries and questions. | Observed | Check prose with `literalAmounts` plus a `USD n` pattern. |
| P2 | **Option provenance in the audit is whatever the client sends** ([D5](technical-repro/r5-provenance-and-publish.mjs)). A client can publish "suggested by gpt-5-pro" for a plain rebalance. Shares are still recomputed and safe. | Observed | Store issued options on the server and publish by option ID. |
| P2 | The offline revision eval labels reference answers as `provider: "openai"`. | Observed | Use `provider: "reference"`. |
| P2 | Seven text nodes are 7–10px on mobile, including the top-up line. The mobile primary action sits about 3,560px down the page. "Settled" and "Captured, not returned" are ambiguous labels. There are no per-person receipts. | Observed | Set a 12px minimum, add a sticky mobile action bar, and add per-person receipt cards. |
| P2 | Unmapped `EXPIRED`/`DENIED`/`PENDING` authorizations. The authorize op's `providerId` is the order ID. No `custom_id`. The evidence README says setup was driven "in the UI", but plan setup was scripted through the API; only the checkouts and approvals were done in the UI. `README.md:122` still lists multi-buyer proof as future work. | Source-inferred / observed | Small fixes and wording corrections. |

The technical judge also confirmed the safety invariant. No option with an unconfirmed limit, and no shares other than the saved-budget allocation, could be published. No share can exceed a saved budget. Nothing private is sent to the model.

## Innovation and landscape (impact judge, sourced)

The following already exist:

- **Split at checkout:** Airbnb Split Payments (2017, reportedly removed in 2018 after host friction), PayByGroup (since 2011), and Hostaway's StretchBill GroupPay.
- **Organizer deposit tools:** WeTravel, SquadTrip and YouLi. YouLi handles dropout reallocation manually.
- **Peer pooling:** PayPal Money Pools, relaunched in 2024. Funds go to the organizer.
- **AI trip planners:** several exist.

The judge found no product that treats a dropout as a new versioned agreement in which each remaining payer authorizes only the difference. All judges agreed that the AI's value, as built, is narrow. With a two-cabin catalog it chooses a cabin and flags whose stated limit needs confirming. Whether it beats a one-question form is unmeasured.

## Beyond the hackathon (unscored investor read, impact judge)

- **Most likely:** a strong *feature*, not a standalone company.
- **Best wedge:** operators and organizers selling fixed-total, variable-headcount inventory (group chalets, charters, retreats, bachelor/ette trips). The seller is already the merchant of record, so Harambee never holds funds. Incumbents reallocate after a dropout by hand.
- **Second path:** a PayPal-native "pay as a group, directly to the merchant" capability. That likely means partnership or acqui-hire.
- **Worst structure:** consumer friend trips on Airbnb/Vrbo. Harambee would have to collect and remit funds, which likely requires money-transmitter licensing or a sponsor partner.
- **Economics to test:**
  - Extra PayPal fixed fees for each top-up order. The evidence run made 4 captures where one charge would do.
  - Who absorbs refund costs.
  - Hold duration under the 3-day honor period and 29-day validity.
  - A sobering comparable: PayByGroup's reported ~$10M processed since 2011.
- **Kill criteria:**
  - Fewer than 2 of 10 recent organizers report a dropout money problem.
  - Dropouts mostly happen after capture.
  - 0 of 5 operators accept split holds.
  - No PayPal multiparty partner path.
  - A one-question form matches the AI.
- **Three experiments for the next 30 days:**
  1. A dropout-timeline interview study with 10–15 organizers.
  2. A hand-run "group checkout link" pitch to 5–10 operators.
  3. A $20 test of AI versus a one-question form on 30 real chat excerpts.

Sources are cited in the judge's report. Several are vendor statistics and are labelled as such there.

## Recommended order

1. **Publish a real screen-recorded video under 3 minutes and link it at the top of the README.** Show buyers approving in PayPal sandbox checkout, the dropout void, the AI options with the model's provenance line, the Maya confirmation, a top-up checkout, and capture IDs matched to the PayPal dashboard. All four judges named this the single highest-leverage step.
2. **Run `eval:revisions:live` and `eval:live` once with a real key** and commit the dated results, including failures.
3. **Fix D1–D3,** make the option cards the single revision entry point, fix the stale progress count, and write proper confirm and re-approval copy.
4. **Lead the README with problem, audience and story,** embed a screenshot, and move the caveats into one "real vs. simulated" table.
5. **Run the operator and organizer experiments** if this continues past the hackathon.

## Method and limits

- **Snapshot:** `git archive` of the committed tree, with no `.env` and no runtime data. `node_modules` is symlinked, not freshly installed. The isolated production server ran without credentials.
- **Technical judge:** ran 55/55 tests, `eval` 22/22, `eval:revisions` 12/12, and the build. Wrote five mock repros.
- **Design judge:** operated the full flow on desktop and at 375px.
- **Impact judge:** did web landscape research.
- **Presentation judge:** reviewed all 29 video frames alongside the transcript.
- **Not done:** no live PayPal or model calls, and no user research.

To rerun the repros: `node docs/judging/2026-10-04-round3/technical-repro/<script>.mjs` from the repo root. Set `HARAMBEE_DIR` to target another checkout. They assert the *existence* of defects at `e3e7593`.
