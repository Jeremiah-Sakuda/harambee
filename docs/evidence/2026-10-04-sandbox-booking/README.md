# PayPal sandbox group booking — October 4, 2026

The integrated group path was run against the real PayPal sandbox (`api-m.sandbox.paypal.com`) on October 4, 2026, 00:18–00:28 EDT. Three distinct sandbox personal buyer accounts approved their own checkouts. Trip setup (creating the trip, switching it to PayPal sandbox, saving budgets) was scripted through the app's local API. Every consent, PayPal checkout, withdrawal, revision and booking step was then done in the app's UI. Each sandbox buyer login and approval was done by the developer. The first audit line in `plan.json` says payments are simulated; that is the default message when a trip is created, before it was switched to sandbox two lines later. Sandbox money is test money. The cabin is a local fixture, so no lodging was purchased.

The files here are copies of the app's stored record at the end of the run: [`plan.json`](plan.json) for the trip and [`sandbox-lab.json`](sandbox-lab.json) for the PayPal sessions. They contain PayPal sandbox order, authorization, capture and payer IDs. They contain no credentials, access tokens or buyer emails.

## What happened

| Time (UTC) | Step | PayPal result |
| --- | --- | --- |
| 04:18 | Three-person trip ($600 Pine & Still fixture), $200 shares, PayPal sandbox mode | — |
| 04:18–04:24 | Maya, Jordan and Alex each consent to version 1 and approve $200 in PayPal checkout as three different buyers | 3 orders created, 3 authorizations `CREATED` |
| 04:25 | Alex withdraws | Alex's authorization voided |
| 04:25 | Version 2 published: $300 / $300 | — |
| 04:25–04:26 | Maya and Jordan consent to version 2. Each approves a separate **$100 top-up** checkout with the same buyer as their first hold | 2 more orders and authorizations |
| 04:27 | Organizer books | 4 captures `COMPLETED` = $600. Fixture reservation committed |

All 15 provider operations (5 create, 5 authorize, 1 void, 4 capture) ended `confirmed`, with none `unknown`. Each used a stable `PayPal-Request-Id` that was persisted before the request was sent.

| Participant | Hold | Capture ID |
| --- | --- | --- |
| Maya | version 1, $200 | `617498144P1562459` |
| Jordan | version 1, $200 | `2MJ692183X295905U` |
| Maya | version 2 top-up, $100 | `7TV5059811935852K` |
| Jordan | version 2 top-up, $100 | `5LH78319LP852124U` |
| Alex | version 1, $200 | voided, never captured |

## What this does and does not show

- It shows the versioned-consent mechanism against PayPal:
  - Separate buyers authorize their own exact shares.
  - A dropout voids a real authorization.
  - The original approval never covers the increase; each remaining buyer approves only the $100 difference.
  - Capture happens only once everyone holds the current version.
- The separate-buyer check compared PayPal payer IDs. Matching each participant to their buyer relied on the operator logging into the intended account; participant links are not authentication.
- It does not demonstrate failure recovery against PayPal (refunds after a failed reservation). That run is recorded separately when performed.
- It is not merchant inventory, a real stay, real funds, webhooks, or user research.
