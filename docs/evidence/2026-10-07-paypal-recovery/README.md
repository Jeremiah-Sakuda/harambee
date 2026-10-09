# Actual PayPal sandbox checks — October 7, 2026

**Closed October 8: both orders expired before approval.** Five preparation checks passed on October 7; neither order was authorized or captured. [Reconciliation](expired-results.json) on October 8 recorded both as `expired_unapproved`. Fresh orders completed the recovery tests in the [October 8 run](../2026-10-08-paypal-recovery/README.md).

The sandbox accepted the configured merchant credentials. Harambee's sandbox-only adapter then created two isolated $1 USD orders. These records are separate from the app's existing group booking.

| Check | Result |
| --- | --- |
| Create refund-test order and read exact USD amount | Passed |
| Repeat create with same request ID; verify same order ID | Passed |
| Create hold-release order and read exact USD amount | Passed |
| Repeat its create with same request ID; verify same order ID | Passed |
| Attempt to authorize before buyer approval | Expected HTTP 422 `ORDER_NOT_APPROVED`; no authorization created |
| Capture and refund with injected local response loss, then restart/reconcile | Not run on these expired orders; passed with fresh orders October 8 |
| Void with injected local response loss, then restart/reconcile | Not run on these expired orders; passed with fresh orders October 8 |

The [sanitized journal](preparation-results.json) records the seven resource API calls (OAuth credential checks are separate), their request/resource IDs and outcomes. It records the tested source commit and payment file hashes. It contains no authentication tokens or buyer credentials. All provider calls were to `api-m.sandbox.paypal.com`.

The private stores in `/private/tmp/harambee-paypal-tests-20261007/` preserve this closed run. Do not resume its expired checkouts; use a fresh test directory.

For a fresh run and the meaning of local response-loss injection, see [SANDBOX_TESTING.md](../../SANDBOX_TESTING.md). These preparation checks are not successful refund evidence; the completed diagnostic recovery evidence is recorded separately on October 8.
