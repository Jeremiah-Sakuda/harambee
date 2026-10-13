# Comparing planning assistance

Compare the hybrid model workflow, the transparent rules comparator and a participant form on the same deidentified trip briefs. The current ten briefs are development fixtures; the next comparison uses separately authored input.

1. Freeze the model prompt, verifier, rule comparator and scorer at a recorded commit before collecting new briefs. Record source hashes and model settings.
2. Ask an author who has not read the development fixtures to supply 12–20 synthetic briefs. For the no-amount comparison, include refusals, relayed views, attendance uncertainty, competing cabin preferences and mixed updates without dollar figures. Clear ceilings and past expenses are covered separately by the 28-case notes benchmark. Use sample names and no credentials or personal data.
3. Give each brief an expected necessary question recipient, supported/opposed cabin. Complete this label before seeing the model or rules output. Match the `chat` and `expect` format in `eval/revision-cases-noamount.json`.
4. Run `node scripts/evaluate-noamount-strict.mjs --cases path/to/briefs.json --live` with the frozen model/verifier and `node scripts/noamount-rules-baseline.mjs --cases path/to/briefs.json`. Record every result, latency and fallback. Keep the frozen comparison corpus independent of tuning.
5. Report correct questions / emitted questions **and** necessary questions supplied / necessary questions. Separate model questions from code checks. Report correct reasons, usable options, budget/consent safety and fallback frequency independently.
6. For a participant-form comparison, ask each person directly for attendance, firm limit and cabin choice. Record the number of questions and organizer corrections needed to produce an approved plan. Measure participant task time in an observed session, separately from model latency.

Keep a development corpus separate from the frozen comparison corpus. Report the original input, expected labels, source/model identity and each output alongside aggregate results. Report interpretation quality and participant effort as the comparison outcomes. A future operator pilot will measure adoption and booking conversion separately.

## Comparison handoff and results template

Give the independent brief author the audience (three remaining friends choosing between a $600 Pine & Still stay and a $480 Creekside stay), participant names Maya/Jordan/Alex, and the case schema. Keep development examples, model outputs and comparator implementation out of that handoff. Ask for 12–20 varied messages covering refusals, relayed preferences, uncertainty and conflicting cabin choices, with no dollar figures in the messages. Label the necessary question recipient and supported/opposed cabin before running any approach.

Use unique case IDs and preserve the supplied `chat` and `expect` objects. Record author, creation date, case-file SHA-256, frozen source commit, model/version and scorer version. Decide the comparison criteria before inspecting results. Keep the original output for every case, including fallback or failure.

| Measure | Model + verifier | Frozen rules | Participant form |
| --- | --- | --- | --- |
| Correct necessary questions / required questions | Measure model and full pipeline separately | Same expected recipients | Required fields answered |
| Correct recipients / emitted questions | Include every emitted question | Include every emitted question | Directed prompts |
| Supported reasons and usable options | Check attribution and opposing/replaced messages | Same labels | Participant-supplied preferences |
| Corrections before a usable plan | Count clarification and correction steps | Same process | Same process |
| Participant/organizer effort | Observed task time and question count | Same task | Same task |
| Model latency, fallback and usage | Record per case | Local runtime | Record interaction time separately |
| Budget and consent checks | Recomputed from confirmed budgets | Same allocator | Same allocator |

Populate this table from the frozen comparison run; the existing development results remain in [Revision options](REVISION_OPTIONS.md). A participant-form session collects attendance, firm spending limit and cabin preference directly. Compare that observed interaction with the assistance workflows on the same task; successful fixture scoring alone does not supply participant effort measurements.
