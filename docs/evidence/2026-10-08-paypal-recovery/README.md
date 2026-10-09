# Actual PayPal sandbox recovery — October 8, 2026

**Both $1 diagnostic recovery workflows passed. All 12 recorded checkpoints passed.** The refund workflow ended `refunded`; the hold-release workflow ended `voided`. Neither workflow has an unresolved payment.

One sandbox buyer approved both diagnostic orders in PayPal's checkout. Harambee then used its real sandbox adapter and diagnostic lab to authorize the orders, capture/refund one, and void the other. These are separate from the existing three-buyer group trip. The main trip's stores were preserved; test stores are isolated in `/private/tmp/harambee-paypal-tests-20261008/`.

The tested payment source is commit `5a4a621`, with no modifications to those files. [results.json](results.json) records their SHA-256 hashes and confirms they stayed stable during execution. The run occurred on October 8 in America/New_York; JSON timestamps use UTC and fall on October 9.

| Workflow | Real provider outcome | Recovery result |
| --- | --- | --- |
| Capture/refund | $1 authorization `CREATED`, capture `COMPLETED`, refund `COMPLETED` | Discarded successful refund response; lab stored `refund_unknown`; reconstruction from disk and PayPal reconciliation reached `refunded` |
| Release hold | $1 authorization `CREATED`, then `VOIDED`; no capture | Discarded successful void response; lab stored `void_unknown`; reconstruction from disk and PayPal reconciliation reached `voided` |

Recovery made **no second refund or void**. Each workflow sent one successful provider write for its refund/void and used one distinct persisted request ID. Final refund and authorization statuses were independently read from PayPal.

## Other verified checkpoints

- Two orders were created and read back at exactly USD 1.00.
- Repeating each order creation with its original request ID returned the original order ID.
- An authorization attempted before buyer approval returned HTTP 422 `ORDER_NOT_APPROVED`; no authorization was created. After approval, a new authorization request succeeded.
- Two previous unapproved orders from October 7 were no longer available at PayPal. Reconciliation closed them as `expired_unapproved`, with no authorization or capture. See their [expiry record](../2026-10-07-paypal-recovery/expired-results.json).

## Evidence

- [Sanitized provider journal and checkpoint assertions](results.json): 24 resource API calls, excluding OAuth. One expected 422; the remaining calls succeeded. Contains request/resource IDs and statuses, without credentials, access tokens, buyer emails or raw provider payloads.
- [Final application state](final-state.json): both sessions settled.
- [Application screenshot](settled-lab.png): the diagnostic panel displays `voided` and `refunded`.

| Resource | ID |
| --- | --- |
| Refund-test order | `2LM50377VM7340632` |
| Refund-test authorization | `8A847183AR789025X` |
| Capture | `70D430477W0057044` |
| Refund | `5YL91102YL032973J` |
| Hold-release order | `6TT44937TB774291Y` |
| Voided authorization | `1R955188EP210305A` |

## Interpretation and remaining limits

Response loss was injected locally **after** a successful PayPal response. Reconstruction creates a new lab object from its persisted JSON store within the same Node process. This proves recovery with the stored records; it is not a forced PayPal outage or a full process-kill test.

For the lost refund response, the application proves settlement through the capture's `REFUNDED` status. It does not rediscover the missing refund ID in its session record. The test journal retains that ID from the intercepted successful response and independently verifies the refund is `COMPLETED`. This is a remaining audit-detail gap, despite successful money recovery.

This run does not force real declined captures, failed refunds, pending authorizations or amount mismatches; those are covered by the [offline matrix](../2026-10-08-offline-sandbox-matrix/README.md). It does not demonstrate multi-buyer refund compensation after a failed cabin reservation, verified webhooks, or real merchant inventory.

See [SANDBOX_TESTING.md](../../SANDBOX_TESTING.md) for the repeatable runner.
