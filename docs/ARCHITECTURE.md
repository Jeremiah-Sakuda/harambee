# Implementation map

The [domain glossary](../GLOSSARY.md) defines consent, payment outcomes, recovery and revision options.

## Payment lifecycle

`GroupPayments` owns plan consent, booking and cancellation. `PaymentLifecycle` owns the durable relationship between a plan payment and its provider session: creation ordering, operation projection, reconciliation, release and recovery. `SandboxLab` retains the provider operation journal and stable request IDs.

A missing persisted session proves that no provider write started. That rule lives in the lifecycle module and serves both release and recovery. Recovery continues across buyers when one remains unresolved; a provider-reported failed refund needs an explicit retry. Existing saved records retain their format. HTTP continues to serialize plan mutations.

The group-payment tests exercise booking and recovery through the same interface used by HTTP, including interruption and restart. Their deterministic PayPal adapter supplies controlled provider outcomes.

## Verified planning

`interpret` and `proposeRevisions` accept an optional `source`. Omit it to select the configured OpenAI adapter; use `null` for local interpretation/planning or `referenceProposalSource(value)` for attributed reference proposals.

A source receives the instructions, privacy-filtered input, schema and request limits. It returns the parsed, untrusted `value` plus `provider`, `model`, `latencyMs` and `usage`. `proposal-source.mjs` owns provider envelopes and transport; each caller owns its domain verification and local fallback. Notes interpretation and revision planning retain their distinct grounding rules.

Semantic tests and offline evaluation cross this verification seam directly. Transport tests check completed responses, strict schemas, non-stored requests, provenance and failures. Reference attribution survives rechecking and publishing. Revision batches retain their plan-version checks and stale-request quota rollback.

## Financial display

`payment-summary.mjs` owns payment-status classification for balances, participant guidance and organizer recovery. `organizerRecovery(state)` also supplies the next-step guidance and action label. `participantCheckouts(state, actor)` limits checkout actions to eligible payments in the active plan version. React renders these projections without rebuilding the recovery state rules.

Tests cover mixed outcomes, status aliases, uncertain operations, failed and pending refunds, completed returns, and the available recovery guidance. Returned funds remain distinct from funds that were never captured.

## Validation

Run `npm test`, `npm run eval` and `npm run build`. Source fingerprints include the lifecycle and proposal-source modules so sandbox evidence and evaluation results identify the implementation they exercised.
