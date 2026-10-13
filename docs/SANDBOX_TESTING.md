# Repeatable sandbox tests

Run the offline matrix without credentials:

```sh
npm run sandbox:simulate
npm run sandbox:simulate -- --output /tmp/harambee-matrix.json
npm run sandbox:simulate -- --strict
npm run test:sandbox
```

The matrix drives the real trip coordinator and diagnostic lab through a synthetic PayPal provider. It blocks network access, preserves provider resources across application restarts, and models duplicate request IDs. It measures application behavior under controlled provider responses. The real sandbox runs below exercise PayPal resource creation, approval, settlement and reconciliation.

On October 8, on commit `6cb7f0a`, the matrix returned **16 passed, 0 known failures, 0 unexpected failures**, and the full suite **113 passed** ([report](evidence/2026-10-08-offline-sandbox-matrix/results.json)). On October 7 it had returned 14 passed and 2 known failures ([report](evidence/2026-10-07-offline-sandbox-matrix/results.json)); both are fixed. Each report records the evaluated commit and hashes of the payment source files, which stayed stable during the run.

| Scenario | Result | Checked behavior |
| --- | --- | --- |
| Repeat booking | Pass | Confirmed trip cannot capture again |
| Deadline expires | Pass | Every authorized hold released without capture |
| Authorization expires | Pass | Booking readiness removed; no capture |
| Authorization pending | Pass | No booking until authorization becomes usable |
| Capture currency mismatch | Pass (failed October 7) | Unverified capture stays `capture_unknown`; no refund or second capture |
| Pending capture completes | Pass | Recovery refunds the eventual completed capture |
| Refund response lost after execution | Pass | Restart reconciliation avoids a second refund |
| Refund response lost before execution | Pass | Recovery reuses the persisted request ID |
| Void response lost after execution | Pass | Restart verifies release without another void |
| Temporary reconciliation failure | Pass | Trip stays unresolved until provider inspection succeeds |
| Crash between lab and coordinator saves | Pass | Persisted refund recovered without duplication |
| Cancel before buyer approval | Pass | Late checkout callback rejected |
| Capture definitively declined | Pass | No capture retry; unused holds released |
| Refund definitively failed | Pass | Failure explained; no automatic retry |
| Capture amount mismatch | Pass (failed October 7) | Unverified capture stays `capture_unknown`; no refund or second capture |
| Explicit retry of failed refunds | Pass | New refund request IDs used only after organizer requests retry |

Known failures are reported separately from passes. `--strict` exits with status 1 when any known or unexpected failure remains. The Node suite marks only the exact recognized assertions as TODO; an unrelated assertion or a scenario setup failure fails the test normally. A fixed scenario automatically counts as passed.

## Resolved mismatch finding

The October 7 matrix found that reconciliation could label a payment `captured` before validating its amount or currency. The October 8 fix preserves `capture_unknown` until verification succeeds and retains investigation guidance.

Both mismatch scenarios now pass: recovery blocks completion, makes no replacement capture, does not refund an unverified amount, and preserves the unknown payment state. See the [October 8 offline report](evidence/2026-10-08-offline-sandbox-matrix/results.json).

## Actual PayPal sandbox

The resumable runner uses Harambee's sandbox-only adapter and diagnostic lab. It creates two $1 orders in a **new isolated directory**, preserving the main app's trip and payment records. The refund case captures $1 and refunds it; the void case releases a $1 authorization without capture. No lodging is purchased.

```sh
npm run paypal:check
npm run sandbox:live -- prepare /tmp/harambee-paypal-test-NEW
# Open both printed approval URLs and approve using a PayPal sandbox buyer.
npm run sandbox:live -- run /tmp/harambee-paypal-test-NEW
npm run sandbox:live -- status /tmp/harambee-paypal-test-NEW
```

`prepare` checks real create/read responses, repeats each creation with the original `PayPal-Request-Id`, and checks that an unapproved order cannot be authorized. It refuses to replace an already prepared run. `run` checks both orders are approved before proceeding.

For each recovery case, the runner discards one successful provider response locally, confirms Harambee stores an unknown operation, reconstructs the lab from disk, and reconciles against PayPal. It verifies the resulting refund or void directly through PayPal and checks recovery used one distinct request ID. This is an injected application-side response loss, not a forced PayPal outage. If PayPal returns a pending result, the runner preserves the record and can be resumed.

The return URL is the optional local test screen at `http://127.0.0.1:3702/?paypal=lab`. Buyer approval still takes effect if that screen is unavailable; the runner checks PayPal directly. Enter buyer credentials only on PayPal's sandbox site, not in chat or repository files.

The directory contains a private session store and a sanitized evidence journal: resource IDs, request IDs, statuses and source hashes, without tokens, passwords, buyer emails or full provider payloads. Preserve these records while any operation is unresolved. The [October 8 actual run](evidence/2026-10-08-paypal-recovery/README.md) completed both recovery workflows with 12 passing checkpoints. The [October 7 preparation run](evidence/2026-10-07-paypal-recovery/README.md) was closed after its unapproved orders expired.

The diagnostic runs exercise individual-payment recovery. The [three-buyer group booking](evidence/2026-10-04-sandbox-booking/README.md) and [three-buyer group refund](evidence/2026-10-08-sandbox-group-refund/README.md) document the integrated journey with local sample inventory.


## Returned money and receipt references

After a lost refund response, a provider-confirmed `REFUNDED` capture proves settlement even if the refund resource ID is not yet present. The app records `refundEvidence: capture-status` and `refundReferenceMissing: true`, keeps the money returned, and identifies the missing receipt separately. **Check receipt reference** performs reconciliation and can fill the original refund ID when the order exposes it; it never repeats a settled refund. The organizer can also look up the displayed capture reference in PayPal sandbox activity. Once the refund resource is verified, evidence becomes `refund-resource` and the pending-reference notice clears.

## Sandbox webhooks (optional)

`POST /api/paypal/webhook` lets PayPal prompt a reconcile instead of waiting for someone to press **Reconcile** or for recovery to run. It never trusts the event: each delivery is checked with PayPal's `/v1/notifications/verify-webhook-signature`, and a verified `CHECKOUT.ORDER.*`, `PAYMENT.AUTHORIZATION.*` or `PAYMENT.CAPTURE.*` event only selects the matching session (by order, authorization, capture or refund ID, or the order's `custom_id`). That session then runs the same reconcile that polling uses, reading the status from PayPal's own records. The route answers as soon as the delivery is verified. Unverified deliveries get 400 and change nothing. Other event types are acknowledged and ignored. Polling and manual reconcile remain the authority.

Setup, sandbox only:

1. Expose the API server (port 3101 by default) on a public HTTPS URL, for example `ngrok http 3101`.
2. In the PayPal Developer Dashboard, open the sandbox app and add a webhook for `https://<tunnel>/api/paypal/webhook`. Subscribe to Checkout order approved, Payment authorization created and voided, and Payment capture completed, denied, pending, refunded and reversed.
3. Put the webhook's ID in `.env` as `PAYPAL_WEBHOOK_ID` and restart. Without it the route answers 503 and does nothing.

The handler is covered by unit tests with a mocked PayPal client (`test/paypal-webhook.test.mjs`). **No live sandbox webhook delivery has been recorded yet**, so treat this path as untested against PayPal until an event ID is captured in `docs/evidence`.

`PAYPAL_PAYEE_EMAIL` (optional) adds `purchase_units[0].payee.email_address` to each order. It is untested in sandbox, and PayPal may refuse a payee on an `AUTHORIZE` order without partner approval.
