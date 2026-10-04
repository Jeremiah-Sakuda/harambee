# Harambee

**A little agreement. A great escape.** A working local hackathon prototype for group cabin commitments, versioned consent, and transparent payment recovery.

[Browser verification and preview](docs/BROWSER_QA.md)

The trip defaults to **simulated payments and local fixture inventory**. An optional **integrated PayPal sandbox group mode** runs the same versioned agreement through separate buyer orders, authorizations, exact top-ups, captures and compensating refunds/voids. A diagnostic lab also remains available. Neither path purchases real lodging. The integrated path has completed a [real PayPal sandbox group booking](docs/evidence/2026-10-04-sandbox-booking/README.md): three buyers, one dropout with a voided authorization, two exact top-ups, and $600 captured. No live-model result is claimed.

[Remediation and remaining evidence gates](docs/REMEDIATION.md) · [Frozen local evaluation](eval/results.json)

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

## Demo walkthrough

1. Start with four friends and the $600 Pine & Still cabin. Click **Review** beside each person, review their saved private $220 ceiling (use **Save budget only** for edits), and select **Agree & authorize simulated hold**. The demo role switch intentionally lets one judge act as each participant.
2. Switch to Organizer. Withdraw Sam using the exit icon. Their hold is voided, and the plan requires a revision.
3. Publish revised shares. Each remaining friend explicitly approves version 2 and a $50 top-up, bringing their total to $200. The original version never grants permission for an increase.
4. Return to Organizer and book. The system locks the plan, captures each simulated payment, and commits local inventory. Open **Activity & receipts** or export the JSON evidence.
5. Reset and approve the group again. Under **Demo scenarios**, choose a capture failure or timeout before booking. **Reconcile & recover** returns confirmed captures, voids unused holds, and releases inventory. The pending-refund scenario requires a second recovery pass; it cannot falsely report completion.
6. For the constrained-budget case, set one remaining person's ceiling to $170 during review, then republish the allocation as Organizer. The deterministic split is $170/$215/$215. **View allocation details** also offers the $480 alternative; a changed cabin requires new consent.

New trips accept three to eight distinct names and a fixed fixture stay on November 6–8, 2026. Creekside has capacity for six, Pine & Still for eight. Unknown ceilings require participant confirmation before approval. The demo allows two people to remain after a withdrawal.

## Optional AI interpretation

```sh
cp .env.example .env
```

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`, then restart. In **Planning notes**, choose **Find the preferences**. The server uses the OpenAI Responses API with a strict structured-output schema, a 12-second timeout, exact source-quote validation, and bounded input/output. Model credentials never reach the browser. No model receives payment tools.

Without a key, or if the model times out or returns unverified content, the app explicitly uses a **local parser**. That fallback is not an AI model. Both paths produce reviewable drafts only: they cannot change budgets, consents, amounts, or payment states. Notes and interpretations are not persisted; they remain in browser memory until reload. If the model is enabled, submitted text is sent to its provider with `store: false`. Do not submit unconsented personal conversations. Latency and token usage are displayed for model responses; provider cost is not calculated. Source-linked drafts now check extracted amounts and names against conservative line-level USD grounding. Contradictions lose their numeric suggestion; discrepant model fields are replaced by source-grounded values and explicitly flagged. This is not a general semantic verifier. Each draft can open a participant review with the source visible; applying a suggestion to the field, saving a budget, and approving a share remain separate actions. No user research or live model accuracy is claimed.

Run `npm run eval` for the frozen 21-case synthetic parser/validator evaluation. `eval/results.json` records 21/21 locally passing cases, including three injected model-output mistakes. This is **not** 100% model accuracy. `npm run eval:live -- --write` explicitly calls the configured provider and records separate live results; it has not been run. Measure real participant correction effort using [the study protocol](docs/VALIDATION_PLAN.md).

Reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Integrated PayPal sandbox group

1. Configure sandbox merchant credentials in `.env`, run `npm run paypal:check` to confirm PayPal accepts them, restart, and start an unfunded trip with three distinct participants. Set each private ceiling to at least $300 for the $600 trip if demonstrating a dropout to two remaining buyers.
2. As Organizer choose **Use PayPal sandbox for this group**. Participant links open separate tab-scoped views; they are local demo selectors, not authentication. Use distinct sandbox buyer accounts and separate browser profiles for their PayPal logins.
3. Each participant reviews the exact version/share, saves their budget separately, and approves. **Agree & open sandbox checkout** sends that buyer to PayPal in the same tab. After approval PayPal returns them to their participant view, which asks the server to authorize the order; **I approved in PayPal — confirm authorization** remains as a manual fallback. Server state validates the exact USD amount and unique buyer identity. Browser approval alone never counts as a hold. A buyer already holding another participant's share has the new hold voided and is asked to use a different sandbox account.
4. Withdraw one participant. Their actual sandbox authorization must be voided before the new version is published. Remaining participants explicitly approve the revised version and additional amount only, then complete their top-up checkouts. Original consent cannot authorize an increase.
5. Book once every exact current share is authorized. Provider captures run sequentially against persisted authorization IDs, followed by a **local fixture** reservation commit. Export the provider-labeled receipt evidence.
6. In a separate prepared trip select **Merchant reservation fails** before booking to exercise compensating refunds. Reconcile until every refund/void is confirmed. An unknown operation remains blocked with investigation guidance; never create a replacement charge. Inspect sandbox activity if the provider cannot supply a recoverable ID.

`test/group-payments.test.mjs` verifies this integrated journey with mocked buyers/providers, restart between provider and coordinator saves, partial capture, unresolved capture, stale checkout, distinct buyers, and fixture-commit failure. The booking journey has also run against the real PayPal sandbox; see the [recorded evidence](docs/evidence/2026-10-04-sandbox-booking/README.md). This is a single-process local prototype with polling reconciliation and no webhooks. The diagnostic lab cannot operate on group-linked sessions. Reset refuses unresolved sandbox money. After a confirmed booking it first archives the trip's provider evidence to `data/archive/`.

## Optional PayPal sandbox lab

Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to a **sandbox** merchant application's credentials, restart, then open **PayPal sandbox lab** beneath the booking sidebar in Organizer view.

1. Create a sandbox order between $1 and $500.
2. Open the generated PayPal approval link and approve using a separate sandbox buyer account.
3. Return and confirm authorization. Server-side provider state is authoritative; browser approval alone does not mark it authorized.
4. Capture the displayed exact test amount, or void the unused authorization.
5. Refund a captured payment, and reconcile pending or unknown results.

The adapter is pinned to `https://api-m.sandbox.paypal.com`; there is no live profile. It persists operation IDs before dispatch, uses `PayPal-Request-Id`, separates authorization/capture/refund statuses, and serializes each lab session. Timeouts become unknown. Reconciliation queries PayPal; an unknown order or capture without a recoverable provider ID requires inspection in the sandbox dashboard and is never automatically recharged. The default demo reset does not delete sandbox operation evidence.

This diagnostic lab is a **single-payment workflow**, separate from the integrated group path above. Authenticated webhook verification remains a release gate. The shared adapter has run against the real sandbox through the integrated group path; the lab's own steps are covered by mocked tests.

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

This is a usable hackathon MVP, not a production payment service. It intentionally uses a single current trip, local merchant fixtures, fixed stay dates, and a visible demo role switch. The first real-money release would require real authentication, isolated user accounts and durable transactional storage; live proof of the implemented multi-buyer PayPal orchestration; verified and deduplicated webhooks; reservation inventory integration; provider reconciliation jobs; retention policy and deletion controls; and observed user/evaluation evidence.

Public hosting is not configured. Default binding is loopback, and the API accepts only local browser origins. No real merchant reservations, payouts, organizer wallets, money transmission, real payment success, fee economics, or user impact are claimed. Google Fonts is the only optional external asset request; system fonts are fallbacks. The cabin art is original inline SVG and works offline.

Use synthetic data. Demo reset clears the simulated trip's stored record; notes never persist. Local financial fixtures remain until reset/deletion, and sandbox audit records remain until explicitly removed after reconciliation. Do not delete unresolved sandbox evidence. These defaults do not establish a production financial-data retention policy.

See [PRD.md](PRD.md) for the original proposed scope, [HACKATHON.md](HACKATHON.md) for judging plans, [SHARED_REQUIREMENTS.md](SHARED_REQUIREMENTS.md) for shared submission requirements, and [DEMO.md](DEMO.md) for a concise recording script. The PRD remains a proposal; this README describes what is actually implemented.

MIT licensed. The [GitHub repository](https://github.com/Jeremiah-Sakuda/harambee) is public (published and verified by the coordinating agent with owner approval). Hosting and a public submission video remain pending; the app does not perform publication.
