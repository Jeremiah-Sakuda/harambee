# Repeatable sandbox tests

Run the offline matrix without credentials:

```sh
npm run sandbox:simulate
npm run sandbox:simulate -- --output /tmp/harambee-matrix.json
npm run sandbox:simulate -- --strict
npm run test:sandbox
```

The matrix drives the real trip coordinator and diagnostic lab through a synthetic PayPal provider. It blocks network access, preserves provider resources across application restarts, and models duplicate request IDs. This tests application behavior; it does not prove PayPal's timing, retention windows, risk decisions, or whether a particular status can be forced in the real sandbox.

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

## Remaining finding

When a capture response contains the wrong amount or currency, booking stops correctly. During reconciliation, the lab copies a `CAPTURED` authorization state into the session before checking the capture amount. That check then throws, leaving the participant's payment labeled `captured` while the capture operation remains `unknown`.

These tests verify that recovery still blocks completion, makes no replacement capture, and does not refund the unverified amount. The outstanding fix is to keep the payment state unknown until the capture's amount and currency are verified, and preserve clear investigation guidance. Both mismatch scenarios fail on that same state-label assertion.

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

The directory contains a private session store and a sanitized evidence journal: resource IDs, request IDs, statuses and source hashes, without tokens, passwords, buyer emails or full provider payloads. Preserve these records while any operation is unresolved. The [October 7 actual run](evidence/2026-10-07-paypal-recovery/README.md) distinguishes completed checks from checks awaiting buyer approval.

These diagnostic runs supplement the existing [three-buyer group booking](evidence/2026-10-04-sandbox-booking/README.md). They do not establish a new multi-buyer trip run, merchant inventory integration, or live-money readiness.
