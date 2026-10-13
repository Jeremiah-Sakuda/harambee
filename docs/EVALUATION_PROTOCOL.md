# Comparing planning assistance

Compare the hybrid model workflow, the transparent rules comparator and a participant form on the same deidentified trip briefs. The current ten briefs are development fixtures; the next comparison uses separately authored input.

1. Freeze the model prompt, verifier, rule comparator and scorer at a recorded commit before collecting new briefs. Record source hashes and model settings.
2. Ask an author who has not read the development fixtures to supply 12–20 synthetic briefs. For the no-amount comparison, include refusals, relayed views, attendance uncertainty, competing cabin preferences and mixed updates without dollar figures. Clear ceilings and past expenses are covered separately by the 28-case notes benchmark. Use sample names and no credentials or personal data.
3. Give each brief an expected necessary question recipient, supported/opposed cabin. Complete this label before seeing the model or rules output. Match the `chat` and `expect` format in `eval/revision-cases-noamount.json`.
4. Run `node scripts/evaluate-noamount-strict.mjs --cases path/to/briefs.json --live` with the frozen model/verifier and `node scripts/noamount-rules-baseline.mjs --cases path/to/briefs.json`. Record every result, latency and fallback. Keep the frozen comparison corpus independent of tuning.
5. Report correct questions / emitted questions **and** necessary questions supplied / necessary questions. Separate model questions from code checks. Report correct reasons, usable options, budget/consent safety and fallback frequency independently.
6. For a participant-form comparison, ask each person directly for attendance, firm limit and cabin choice. Record the number of questions and organizer corrections needed to produce an approved plan. Measure participant task time in an observed session, separately from model latency.

Keep a development corpus separate from the frozen comparison corpus. Report the original input, expected labels, source/model identity and each output alongside aggregate results. Report interpretation quality and participant effort as the comparison outcomes. A future operator pilot will measure adoption and booking conversion separately.
