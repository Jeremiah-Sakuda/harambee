# Round-two browser verification

The coordinator operated the isolated production UI at port 3301, captured October 3, 2026 local time, using application source `e28bc2a8811465b09166f44064bd2d080b158b76`. The subsequent documentation commits did not change this captured behavior. The final evidence commit additionally disables budget-save and approval controls when inspecting a note after a trip closes; the server already rejected those operations.

Observed in the browser:

- Maya saved a $120 ceiling without authorizing or approving the existing $150 share. The old approval was disabled and the dialog explained the required revision.
- Publishing version 2 produced $120/$160/$160/$160. Opening Maya's review from Organizer preserved the saved $120 ceiling.
- All four participants explicitly approved version 2. The prepared capture-timeout scenario stopped booking with $320 held, $120 captured and a separate $160 unknown operation.
- Recovery reconciled the unknown operation, returned $280 and voided unused holds. Final summary showed $0 held/captured/refund-pending, $280 returned, and cancelled fixture inventory.
- At a 375px viewport, no horizontal page overflow was observed. The consent screen was captured; this is not a complete accessibility audit.
- `$1,000` produced a $1,000 draft. Jordan's negated $300 note required clarification. Opening Maya's note kept the saved $120; the suggested amount required an explicit apply-to-field action, followed by a separate budget save.

The evidence is six actual UI screenshots in `docs/demo/frames/`. The narrated preview is an edited sequence of these still captures with synthesized narration, not a continuous screen recording. It shows simulated payments and the local parser only; no live PayPal or model execution is established.

A server process ended when its owning agent finished; a fetch failed until the coordinator restarted the isolated server (session 37936). This was test-process lifecycle, not a reproduced application failure.

Local automated verification: 37 tests, 21/21 synthetic offline parser/validator cases and a successful Vite production build. The archive also installed a fresh dependency tree with `npm ci --offline` from cache. Provider execution, participant research and a public YouTube submission remain pending.
