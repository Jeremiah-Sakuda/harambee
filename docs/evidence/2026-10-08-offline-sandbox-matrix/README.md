# Offline payment matrix — October 8, 2026

[results.json](results.json) records the same sixteen synthetic scenarios as the [October 7 matrix](../2026-10-07-offline-sandbox-matrix/README.md), run against commit `6cb7f0a` with no uncommitted changes to the tested files: sixteen passed, no known failures, no unexpected failures. Provider calls: zero.

The two October 7 known failures (a capture with the wrong currency or amount could be labelled captured during reconciliation) are fixed: the capture is verified before the authorization's status is trusted, so it stays `capture_unknown` and is never refunded or captured again automatically. The declined-capture and failed-refund scenarios, legacy findings from the October 7 panel, also pass.

These are synthetic provider responses, not PayPal. See [SANDBOX_TESTING.md](../../SANDBOX_TESTING.md) for commands and interpretation.
