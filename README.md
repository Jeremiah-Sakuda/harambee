# Harambee — group trips where nobody fronts the money

**A little agreement. A great escape.** *Harambee* means “all pull together” in Swahili.

![Left: revision options from a live gpt-4.1-mini run after Sam drops out. Right: the board after the recorded PayPal sandbox booking](docs/preview.png)

*Left: options from a live gpt-4.1-mini run after Sam drops out, with each person's words as the reasons and a question for Jordan (this run used simulated payments). Right: the [recorded PayPal sandbox booking](docs/evidence/2026-10-04-sandbox-booking/README.md), where Alex left, his authorization was voided, Maya and Jordan each authorized a $100 top-up, and $600 was captured. They are two separate runs.*

> **Judging in 3 minutes?** `npm ci && npm run dev`, open http://127.0.0.1:5171, and follow the [demo walkthrough](#demo-walkthrough) (no credentials needed). Without keys, payments are simulated and revision options come from the labelled no-AI local planner: the same $170 / $215 / $215 table, without the model's quoted reasons and questions. What's real vs simulated is in the table below; the PayPal evidence is in [`docs/evidence/`](docs/evidence/2026-10-04-sandbox-booking/README.md); the AI's live results and their caveats are under [Revision options](#revision-options-after-a-dropout).

**The problem:** one friend books the $600 cabin, then spends weeks chasing everyone for their share. When someone drops out before it's booked, that friend absorbs the gap. Harambee covers that window: nobody, including the organizer, is out of pocket until the whole group commits, and nobody pays more without approving it. After booking, the cabin's own cancellation policy applies.
**Who it’s for:** groups of 3–8 friends booking a shared stay.
*Context, not our data:* in 2017 Airbnb reported that an estimated 38% of guests hadn’t received all the money owed to them from group trips ([VentureBeat](https://venturebeat.com/ai/airbnb-now-lets-groups-of-guests-split-the-cost-of-their-stay)), and in 2024 PayPal relaunched money pools for group trips and gifts, citing customer demand ([TechCrunch](https://techcrunch.com/2024/11/19/paypal-revives-its-money-pooling-feature/)). We have no user research of our own yet.

**How it works:**

1. Each friend approves their own exact share with a **PayPal authorization**. It is a hold, not a charge, and nobody is charged until everyone is in.
2. When someone drops out, their hold is voided. The group’s chat becomes **verified revision options**: a model proposes, and code checks every quote and computes every share. A limit like “I can’t go above $170” only counts once that person confirms it.
3. Everyone approves the new version. Earlier approval never covers an increase, so each person authorizes only the difference in their own PayPal checkout. Then Harambee captures and books.

Holds are collected within a 48-hour window and captured as soon as the group books, inside PayPal’s 3-day honor period for authorizations (an authorization stays valid for 29 days and can be reauthorized; see [PayPal: authorization](https://developer.paypal.com/docs/checkout/standard/customize/authorization/)).

| Real | Simulated or pending |
| --- | --- |
| PayPal sandbox orders, authorizations, voids and captures from three separate buyers. See the [recorded sandbox group booking](docs/evidence/2026-10-04-sandbox-booking/README.md). | The cabin and its reservation (local sample listing; no lodging is purchased) |
| Real sandbox group compensation: [three $200 captures refunded after fixture commit failure](docs/evidence/2026-10-08-sandbox-group-refund/README.md), independently checked with PayPal; $600 returned, no booking | Fourth sandbox buyer and narrated submission video pending |
| Versioned consent, the exact-difference top-ups, and recovery that never charges twice (113 tests, including declined captures, failed refunds, orders PayPal dropped, and a 16-scenario offline PayPal matrix) | Default no-credentials mode simulates payments |
| AI revision options against a live model (gpt-4.1-mini), with code checks and an ambiguity backstop: in no live run could a publishable option exceed a saved budget; 24–26/26 synthetic briefs useful over the last four live runs, versus 23/26 for the no-AI local planner; on 10 pre-registered briefs with no dollar amount, 8–9/10 versus 0/10 ([details and caveats](#revision-options-after-a-dropout)) | No user research; synthetic briefs only |

## How this differs

As of October 2026, in what we found:

| What exists | What it does | What Harambee adds |
| --- | --- | --- |
| “Nobody pays until everyone pays” group checkout ([PayByGroup, 2012](https://techcrunch.com/2012/09/25/no-more-awkward-you-owe-me-money-reminders-paybygroup-lets-friends-split-group-purchases)) and tipping-point collection ([Crowdtilt/Tilt](https://en.wikipedia.org/wiki/Tilt.com), acquired by Airbnb in 2017) | Each person commits a share; nobody is charged unless the whole amount is reached. PayByGroup also let percentages change as more people joined | The all-or-nothing idea is theirs. Harambee adds what happens when the group *changes* after people have committed: a new version, fresh consent from everyone, and only the difference authorized |
| Commit-now, pay-later group funds ([TableCash, September 2026](https://www.wboc.com/online_features/press_releases/tablecash-launches-commit-now-pay-later-for-group-plans-friends-put-a-card-down-up/article_8bd46577-9275-532c-b7ae-25630e5e5648.html), company press release) | Each person saves a card behind their share for a house or cabin; cards are charged together when the goal fills, and promises can be withdrawn before then. Money goes to the organizer through Stripe | The closest current product. Harambee's holds go to the merchant rather than an organizer, and after a dropout nobody's earlier promise stretches to a higher share |
| Split payment at booking ([Airbnb, 2017](https://techcrunch.com/2017/11/28/airbnb-launches-payment-splitting-for-group-trips/), reportedly withdrawn later; [Wander “Split with Friends”, 2025](https://wander.com/article/introducing-split-with-friends-an-industry-first)) | The organizer pays their part to hold the dates; others pay within a window (48 hours at Wander) | Holds instead of charges for everyone, including the organizer, and a plan that can change after someone leaves |
| Group collection ([PayPal pools](https://techcrunch.com/2024/11/19/paypal-revives-its-money-pooling-feature/), [Venmo Groups](https://techcrunch.com/2023/11/14/venmo-gets-a-new-way-to-split-expenses-among-groups-like-clubs-teams-trip-buddies-and-more), Splitwise) | Collects or tracks money owed to one person | Each friend’s authorization goes to the merchant; nobody acts as the group’s bank |
| AI trip planners with group chat ([Mindtrip](https://globetrender.com/2024/09/24/mindtrip-launches-group-chat-feature/)) | Turn shared preferences into an itinerary | Turn a dropout into price options that are checked by code and re-approved by each person |
| **The new part** | | When the group changes, a new version needs fresh consent from everyone remaining, and each person authorizes only the difference. Earlier approval never covers an increase. |

Each building block exists elsewhere: all-or-nothing group commitment, authorizations, split checkout, and extracting details from chat with a model. The narrower contribution is consent after a dropout: when the group changes after commitment, nobody's earlier approval stretches to a higher share. Each person re-approves and authorizes only the difference, directly to the merchant, and limits read from chat count only once their owner confirms them.

## Who is the merchant, and who pays

The cabin operator is the merchant. In a real deployment, each friend’s authorization would be made to the operator’s own PayPal business account, so Harambee never holds or moves the group’s money. PayPal supports this for platforms through its [multiparty](https://developer.paypal.com/docs/multiparty/) integration. For authorize-then-capture, the order and the authorization name the seller as `payee` ([multiparty authorize and capture](https://developer.paypal.com/docs/multiparty/checkout/standard/customize/auth-capture/)). That page requires an approved PayPal partner, sellers onboarded first, and the `PARTNER_FEE` onboarding feature for a platform fee. (PayPal's multiseller page requires `intent: CAPTURE`, so it doesn't fit a hold-first design.) We are not an approved partner. This prototype is not that integration: sandbox captures land in its own sandbox merchant account.

Hypotheses, not results:

- Operators who take direct bookings would accept several authorizations for one stay, because every share is held before dates are committed.
- Groups would accept a small disclosed platform fee so that one friend doesn’t front the cost.
- Who absorbs processing costs on released holds and refunds after a failed booking is an open question for operator conversations.

**First customers (hypothesis):** independent cabin and glamping operators with their own booking site who already accept PayPal. What we would test with them: whether they prefer several held shares to one organizer's card, and at what fee compared with what they pay today. No operator has been asked yet.

**Why earlier attempts stalled (hypotheses, not findings):**

- Airbnb's 2017 split payments committed the reservation when the organizer paid, and gave everyone else 72 hours ([TechCrunch](https://techcrunch.com/2017/11/28/airbnb-launches-payment-splitting-for-group-trips/)). If friends didn't pay, a reservation the host had counted on could fall through. Harambee holds every share *before* dates are committed, so a host never sees a booking cancelled for non-payment.
- Tilt was acquired by Airbnb and shut down in 2017 ([Wikipedia](https://en.wikipedia.org/wiki/Tilt.com)), so its end says little about demand.
- Collection apps (pools, TableCash) route money to the organizer, which makes the organizer the group's bank again. Harambee's authorizations go to the merchant.

These are our reading of public sources, to be checked in the operator conversations above.

## Run locally

Requires Node.js 22+ and npm. No credentials are needed for the default demo.

```sh
npm ci
npm run dev
```

Open [Harambee](http://127.0.0.1:5171). Vite serves the UI on port 5171 and proxies API requests to port 3101. The backend does not auto-restart when you edit server files; restart `npm run dev` after backend changes. Frontend updates reload automatically.

For one local production server:

```sh
npm run build
npm start
```

Open [the production build](http://127.0.0.1:3101). Do not run the dev and production backend simultaneously. `PORT`, `HOST`, and `DATA_FILE` can override local defaults; Vite's API proxy expects port 3101.

```sh
npm test
```

The native Node test suite covers exact allocations, private budget projection, role checks, stale version rejection, explicit top-ups, duplicate operations, deadlines, cabin capacity, restart persistence, capture failures and timeouts, refunds pending confirmation, merchant failures, and sandbox adapter contracts. GitHub Actions runs tests and a production build.

For the additional 16-scenario payment matrix, strict checks of known failures, and isolated $1 PayPal sandbox recovery tests, see [Sandbox testing](docs/SANDBOX_TESTING.md). The [October 8 run](docs/evidence/2026-10-08-offline-sandbox-matrix/README.md) passes all sixteen scenarios; the two amount/currency failures recorded on October 7 are fixed.

For filming-day preparation, see [the three-run rehearsal command](docs/FILMING_PREFLIGHT.md). The narrated submission video will be recorded later.

## Demo walkthrough

1. Start with four friends and the $600 Pine & Still cabin. Click **Review** beside each person, review their saved private $220 ceiling (use **Save budget only** for edits), and select **Agree & authorize simulated hold**. The demo role switch intentionally lets one judge act as each participant.
2. Switch to Organizer. Withdraw Sam using the exit icon. Their hold is voided, and the plan requires a revision.
3. Choose **Suggest options**. Harambee reads the group chat pasted into **Planning notes**. In the sample chat Sam leaves, Maya says she “can’t go above $170” now, and Alex prefers the cheaper cabin. Code computes every share and top-up for the verified options, and each AI option lists the chat lines behind it. Maya’s $170 option waits for her: choose **Send Maya a confirmation request**, then open Maya’s view (**Demo controls → Open Maya’s view**) and confirm there. The organizer’s card updates by itself. The plain rebalance ($200 each) and the cheaper cabin ($160 each) are also offered; an option that produces exactly the same split as another is shown once. See [Revision options](#revision-options-after-a-dropout).
4. Publish an option. Each remaining friend explicitly approves the new version and their exact top-up. The original version never grants permission for an increase.
5. Return to Organizer and book. The system locks the plan, captures each simulated payment, and commits local inventory. Open **Activity & receipts** or export the JSON evidence.
6. Reset and approve the group again. Under **Demo scenarios**, choose a capture failure or timeout before booking. The board says in plain words why booking stopped, whose payment failed, and what will be returned. **Return money & release holds** checks each payment with the provider, refunds confirmed captures, voids unused holds, and releases inventory. The pending-refund scenario requires a second recovery pass; it cannot falsely report completion.
7. If nobody's limits can cover any cabin (withdraw two people), the options say so and offer **Cancel trip & release every hold**.
8. For the constrained-budget case, set one remaining person's ceiling to $170 during review, then republish the allocation as Organizer. The deterministic split is $170/$215/$215. **View allocation details** also offers the $480 alternative; a changed cabin requires new consent.

New trips accept three to eight distinct names and a fixed fixture stay on November 6–8, 2026. Creekside has capacity for six, Pine & Still for eight. Unknown ceilings require participant confirmation before approval. The demo allows two people to remain after a withdrawal.

## Optional AI interpretation

```sh
cp .env.example .env
```

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`, then restart. In **Planning notes**, choose **Find the preferences**. The server uses the OpenAI Responses API with a strict structured-output schema, a 12-second timeout, exact source-quote validation, and bounded input/output. Model credentials never reach the browser. No model receives payment tools.

Without a key, or if the model times out or returns unverified content, the app explicitly uses a **local parser**. That fallback is not an AI model. Both paths produce reviewable drafts only: they cannot change budgets, consents, amounts, or payment states. Notes and interpretations are not persisted; they remain in browser memory until reload. If the model is enabled, submitted text is sent to its provider with `store: false`. Do not submit unconsented personal conversations. Latency and token usage are displayed for model responses; provider cost is not calculated. Source-linked drafts now check extracted amounts and names against conservative line-level USD grounding. Contradictions lose their numeric suggestion; discrepant model fields are replaced by source-grounded values and explicitly flagged. This is not a general semantic verifier. Each draft can open a participant review with the source visible; applying a suggestion to the field, saving a budget, and approving a share remain separate actions. No user research or live model accuracy is claimed.

Run `npm run eval` for the frozen 22-case synthetic parser/validator evaluation. `eval/results.json` records 22/22 locally passing cases, including three injected model-output mistakes. This is **not** 100% model accuracy. `npm run eval:live -- --write` explicitly calls the configured provider and records separate live results. This notes-interpreter eval has not been run live; the live runs below cover revision options. Measure real participant correction effort using [the study protocol](docs/VALIDATION_PLAN.md).

Reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Revision options after a dropout

When someone leaves, the organizer chooses **Suggest options**. A model (gpt-4.1-mini) reads the group chat and proposes up to three options, each with its reasons quoted from people's own messages. Code checks every quote, amount and speaker, computes every share, and shows the plain rebalance alongside. A limit read from chat counts only after its owner confirms it in their own view, and the model never sees anyone's saved budget. Without a key, a labelled **local planner (not AI)** keeps the flow working.

| | Model | No-AI local planner |
| --- | --- | --- |
| Sample chat, 3 live runs | Only Maya confirms, $170 / $215 / $215; that card's **Why** is Maya's limit and Jordan's “I can stretch a bit…”; Alex's Creekside wish is shown as pointing to another option; one on-topic question each run | Same table and confirmation, no reasons, no questions |
| 26 synthetic briefs with amounts | 24–26/26 useful across the last four rounds, 26/26 budget-safe | 23/26 useful, 26/26 safe |
| 10 briefs with no amount, pre-registered | 8–9/10 over three runs | 0/10 |

In no live run could a publishable option exceed a saved budget: every chat-read limit needs its owner's confirmation, and publishing recomputes from saved budgets. These are small synthetic sets written by the developer, with no user data.

**[How options are checked, privacy, the ambiguity backstop, every live run and its caveats →](docs/REVISION_OPTIONS.md)**

## Integrated PayPal sandbox group

1. Configure sandbox merchant credentials in `.env`, run `npm run paypal:check` to confirm PayPal accepts them, restart, and start an unfunded trip with three distinct participants. Set each private ceiling to at least $300 for the $600 trip if demonstrating a dropout to two remaining buyers.
2. As Organizer open **Demo controls** and choose **Use PayPal sandbox for this group**. Participant links open separate tab-scoped views; they are local demo selectors, not authentication. Use distinct sandbox buyer accounts and separate browser profiles for their PayPal logins.
3. Each participant reviews the exact version/share, saves their budget separately, and approves. **Agree & open sandbox checkout** sends that buyer to PayPal in the same tab. After approval PayPal returns them to their participant view, which asks the server to authorize the order; **I approved in PayPal — confirm authorization** remains as a manual fallback. Server state validates the exact USD amount and unique buyer identity. Browser approval alone never counts as a hold. A buyer already holding another participant's share has the new hold voided and is asked to use a different sandbox account.
4. Withdraw one participant. Their actual sandbox authorization must be voided before the new version is published. Remaining participants explicitly approve the revised version and additional amount only, then complete their top-up checkouts. Original consent cannot authorize an increase.
5. Book once every exact current share is authorized. Provider captures run sequentially against persisted authorization IDs, followed by a **local fixture** reservation commit. Export the provider-labeled receipt evidence.
6. In a separate prepared trip select **Merchant commit fails** before booking to exercise compensating refunds. Reconcile until every refund/void is confirmed. An unknown operation remains blocked with investigation guidance; never create a replacement charge. If PayPal declines a capture, nothing was taken and the open hold is voided. If PayPal reports a refund as failed or cancelled, the board says so with PayPal's reason, and the refund is retried only when the organizer chooses **Retry the failed refund**, with a new request ID. An order nobody approved that PayPal no longer has is closed as abandoned. **Cancel trip** voids every hold the same way. Inspect sandbox activity if the provider cannot supply a recoverable ID.

`test/group-payments.test.mjs` verifies this integrated journey with mocked buyers/providers, restart between provider and coordinator saves, partial capture, unresolved capture, stale checkout, distinct buyers, and fixture-commit failure. The booking journey has also run against the real PayPal sandbox; see the [recorded evidence](docs/evidence/2026-10-04-sandbox-booking/README.md). The separate [October 8 group refund run](docs/evidence/2026-10-08-sandbox-group-refund/README.md) also verified three distinct buyers, $600 captured then fully refunded after a fixture reservation failure. This is a single-process local prototype with polling reconciliation and no webhooks. The diagnostic lab cannot operate on group-linked sessions. Reset refuses unresolved sandbox money. After a confirmed booking it first archives the trip's provider evidence to `data/archive/`.

## Optional PayPal sandbox lab

Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to a **sandbox** merchant application's credentials, restart, then open **PayPal sandbox lab** beneath the booking sidebar in Organizer view.

1. Create a sandbox order between $1 and $500.
2. Open the generated PayPal approval link and approve using a separate sandbox buyer account.
3. Return and confirm authorization. Server-side provider state is authoritative; browser approval alone does not mark it authorized.
4. Capture the displayed exact test amount, or void the unused authorization.
5. Refund a captured payment, and reconcile pending or unknown results.

The adapter is pinned to `https://api-m.sandbox.paypal.com`; there is no live profile. It persists operation IDs before dispatch, uses `PayPal-Request-Id`, separates authorization/capture/refund statuses, and serializes each lab session. Timeouts become unknown. Reconciliation queries PayPal; an unknown order or capture without a recoverable provider ID requires inspection in the sandbox dashboard and is never automatically recharged. The default demo reset does not delete sandbox operation evidence.

This diagnostic lab is a **single-payment workflow**, separate from the integrated group path above. Its real sandbox [October 8 recovery run](docs/evidence/2026-10-08-paypal-recovery/README.md) captured and refunded $1, voided a separate $1 hold, and recovered both after successful responses were deliberately discarded. All 12 checkpoints passed. The lab reconstructed its state from disk; recovery sent no duplicate refund or void. Authenticated webhook verification remains a release gate.

References: [PayPal delayed capture](https://developer.paypal.com/checkout/delay-capture/), [Payments v2](https://developer.paypal.com/docs/api/payments/v2/), [Orders v2](https://developer.paypal.com/docs/api/orders/v2/).

## Implementation

- React + Vite frontend with responsive desktop/mobile layouts, keyboard-operable native dialogs, labeled inputs, visible focus, and reduced-motion support.
- Node HTTP backend; integer-cent deterministic capped allocation; versioned consent and independent agreement/payment states.
- Atomic JSON snapshots in `data/plan.json`; a separate `data/sandbox-lab.json` retains sandbox evidence. Each simulator operation has a unique stable key and is stored before its confirmed result.
- A single backend process serializes all mutation requests, including asynchronous provider calls. This is not a distributed database or multi-process locking scheme.
- The booking coordinator stops after a failed/unknown capture. It reconciles uncertainty before refunding captures and voiding unused holds. A merchant commit timeout can reconcile to confirmed without repeating captures.
- Deadlines sweep on startup, on API access, and every 30 seconds while the process runs. Expired simulated holds are voided and late approvals rejected. Sandbox expiry runs the asynchronous provider recovery path; uncertainty keeps recovery open.
- Demo roles are checked at API actions; budgets are projected only to their participant identity. **The role switch is not authentication.** Keep this local until real identity/session authorization is implemented.

## Scope and release gates

This is a usable hackathon MVP, not a production payment service. It intentionally uses a single current trip, local merchant fixtures, fixed stay dates, and a visible demo role switch. The first real-money release would require real authentication, isolated user accounts and durable transactional storage; broader provider evidence (multi-buyer compensation after a failed reservation remains unrecorded); verified and deduplicated webhooks; reservation inventory integration; provider reconciliation jobs; retention policy and deletion controls; and observed user/evaluation evidence.

Public hosting is not configured. Default binding is loopback, and the API accepts only local browser origins. No real merchant reservations, payouts, organizer wallets, money transmission, real payment success, fee economics, or user impact are claimed. Google Fonts is the only optional external asset request; system fonts are fallbacks. The cabin art is original inline SVG and works offline.

Use synthetic data. Demo reset clears the simulated trip's stored record. The pasted group chat itself is never saved; it stays in browser memory, and the server keeps it only in memory while options are open. One exception: when the organizer sends a limit request, up to 200 characters of that person's own message are saved with the request in `plan.json`, so their card can quote it. Only that person and the organizer can see it, and reset clears it. Local financial fixtures remain until reset/deletion, and sandbox audit records remain until explicitly removed after reconciliation. Do not delete unresolved sandbox evidence. These defaults do not establish a production financial-data retention policy.

See [PRD.md](PRD.md) for the original proposed scope, [HACKATHON.md](HACKATHON.md) for judging plans, [SHARED_REQUIREMENTS.md](SHARED_REQUIREMENTS.md) for shared submission requirements. The PRD remains a proposal; this README describes what is actually implemented.

MIT licensed. Source: [github.com/Jeremiah-Sakuda/harambee](https://github.com/Jeremiah-Sakuda/harambee).
