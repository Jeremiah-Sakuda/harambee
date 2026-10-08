# Actual PayPal sandbox checks — October 7, 2026

**Current completion: five checks passed; buyer approval is required for capture/refund and authorization/void recovery.** No capture, refund or authorization has been performed in this run so far.

The sandbox accepted the configured merchant credentials. Harambee's sandbox-only adapter then created two isolated $1 USD orders. These records are separate from the app's existing group booking.

| Check | Result |
| --- | --- |
| Create refund-test order and read exact USD amount | Passed |
| Repeat create with same request ID; verify same order ID | Passed |
| Create hold-release order and read exact USD amount | Passed |
| Repeat its create with same request ID; verify same order ID | Passed |
| Attempt to authorize before buyer approval | Expected HTTP 422 `ORDER_NOT_APPROVED`; no authorization created |
| Capture and refund with injected local response loss, then restart/reconcile | Awaiting buyer approval |
| Void with injected local response loss, then restart/reconcile | Awaiting buyer approval |

The [sanitized journal](preparation-results.json) records the seven resource API calls (OAuth credential checks are separate), their request/resource IDs and outcomes. It records the tested source commit and payment file hashes. It contains no authentication tokens or buyer credentials. All provider calls were to `api-m.sandbox.paypal.com`.

The resumable private stores are in `/private/tmp/harambee-paypal-tests-20261007/`. After buyer approval, resume with:

```sh
npm run sandbox:live -- run /private/tmp/harambee-paypal-tests-20261007
```

For a fresh run and the meaning of local response-loss injection, see [SANDBOX_TESTING.md](../../SANDBOX_TESTING.md). These are diagnostic lab tests, not a new multi-buyer group booking. Pending recovery cases must not be counted as successful refund evidence.
