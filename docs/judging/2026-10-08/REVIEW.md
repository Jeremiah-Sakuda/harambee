# Harambee — independent judging panel, October 8, 2026

**Panel average: 65.7/100. Readiness: conditional.** Three independent simulated judges reviewed [commit `0ce5ebe`](https://github.com/Jeremiah-Sakuda/harambee/commit/0ce5ebecd2b93dfb7dad317c2332a3433f86f973). This is a mock assessment, not an official score, competition ranking or prize prediction.

The strongest part remains implemented financial consent: a changed group requires a new agreement, and each participant authorizes only their own increase. The new three-buyer $600 refund evidence and wider recovery tests strengthen the technical case. The panel still found a failed-verification state gap, unsupported AI narrative, accessibility issues, incomplete video presentation, and unvalidated user/merchant benefit.

## Independent scores

Five criteria receive equal weight under the [official hackathon rules](https://paypalaihackathon.devpost.com/rules), checked October 8. The 0–10 scale and half-point calibration are ours; total = twice the sum. No judge saw prior scores, other judges’ reports or other projects. Scores were not negotiated.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical](technical/report.md) | 8.0 | 7.5 | 6.0 | 7.0 | 4.0 | **65** |
| [Design/usability](design/report.md) | 8.0 | 7.5 | 6.0 | 7.0 | 5.0 | **67** |
| [Impact/innovation](impact/report.md) | 8.0 | 7.5 | 6.5 | 6.5 | 4.0 | **65** |
| **Average** | **8.00** | **7.50** | **6.17** | **6.83** | **4.33** | **65.7** |

All judges gave conditional readiness and medium confidence. Design awarded more presentation credit to the working screens and written package; all agreed that plans and screenshots cannot establish the missing video’s quality.

Compared with the [October 7 panel](../2026-10-07/REVIEW.md), 65.3 → 65.7 is broadly unchanged. This is a fresh-panel assessment with different evidence and findings, not a calibrated measurement of improvement. Technology averages 8.0, but presentation remains the lowest criterion. The new comparison with TableCash’s published primary specification also narrows the defensible innovation claim.

## What earns credit

- **113/113 automated tests and all 16 payment scenarios pass.** Technical and impact judges reran the native suite; technical and coordinator independently replayed the fixture matrix. Declined capture, failed refund, deliberate retry, response-loss, restart and covered capture amount/currency cases behave correctly.
- **Consent and privacy are substantive.** The technical judge and coordinator reproduced withdrawal, Maya’s owner-only $170 confirmation, $170/$215/$215 revision, $20/$65/$65 top-ups, stale-version and wrong-role blocks, and duplicate-booking protection. Mock model requests excluded saved budgets and payment tools, and fabricated limits were rejected.
- **Matching-source real sandbox compensation is recorded.** Three distinct buyers each had $200 captured and refunded after an intentional local fixture commit failure. All three refund records are COMPLETED and their captures REFUNDED; the five payment-source hashes match this reviewed commit. Judges inspected the submitted records, without making fresh authenticated provider calls. The separate $1 diagnostic run covers injected response loss and reconstruction; its refund-ID audit caveat remains disclosed.
- **Observed entry screens are coherent and responsive.** The design judge inspected desktop and 375px board, approval, allocation and keyboard behavior. Initial mobile document width equals scroll width at 375px. Exact shares, holds versus charges and separate budget saving are understandable.
- **AI’s narrow role has evidence.** Independently reproduced local baselines score 23/26 useful on amount briefs and 0/10 on no-amount briefs; submitted current model records score 24/26 and 8/10. These small developer-written sets support a capability distinction, not measured participant benefit or general accuracy.

## Findings to address

| Priority | Finding and verified boundary | Smallest concrete action |
| --- | --- | --- |
| P1 | **Failed authorization verification can leave booking ready.** Injecting an authorization GET of USD 199.99 after a USD 200 approval causes the amount check to throw, while the payment remains authorized and ready. Booking then dispatches one amountless capture before the capture validator blocks. Technical judge and coordinator reproduced this using a provider fixture. No actual PayPal authorization change or real-money charge was established. Anchors: `server/sandbox-lab.mjs:154`, `server/group-payments.mjs:29`, `:265`, `:290`, `server/paypal.mjs:99`. | Persist an unverified/blocked authorization state and clear readiness before returning the error. Add a regression requiring zero capture calls after the mismatch. |
| P1 | **AI narrative can overstate willingness.** The recorded summary asserts Jordan can pay more than $220 from a vague “stretch a bit” message. The summary is accepted because the number appears somewhere in the chat. Coordinator repeated the offline injection; actual budgets and payment consent remain protected. Anchors: `server/revision-options.mjs:1150`, `src/RevisionOptions.jsx:123`, `eval/demo-chat-live-runs.json:20`. | Generate commitment-related summary clauses from checked quotes/statuses, or remove that free-text summary while retaining verified reasons and questions. |
| P1 | **Consent/helper text lacks contrast.** Design measured 13px terms at 3.65:1 and helpers at 3.14:1 on the dialog background. Anchors: `src/style.css:1157`, `:783`, `:2180`; screenshot in the design report. | Darken informative dialog copy to meet 4.5:1; verify rendered approval states. |
| P1 submission | **The actual narrated video is absent.** No completed current video or public YouTube URL was found. Deferred filming and the three-run preparation tool receive planning credit only. | On the chosen filming day, record actual current behavior with captions and provider/fixture labels, verify under-three-minute playback, and add the real URL to README and Devpost. |
| P1/P2 evidence | **User benefit and merchant adoption remain hypotheses.** The no-AI baseline cannot produce no-amount reasons/questions, and the scorer does not measure meaningful agreement, correction effort or time. No operator or participant observations exist. | Compare against a practical attendance/preference/ceiling form and tighten question-quality scoring. Gather observations and operator input when interviews resume; the user has deferred them for now. |
| P2 | **Approval dismissal loses keyboard position.** Twice, opening Review with Enter then pressing Escape left focus at BODY; allocation dismissal correctly returned focus. Anchor: `src/main.jsx:213`, `:320`, `:1566`. | Preserve the invoking control and restore focus to it or a logical successor. |
| P2 | **Novelty and evidence copy need precision.** TableCash’s [published terms](https://tablecash.app/terms) include fixed commitments, recorded consent, pre-charge changes, group authorization/capture, refunds and approval of autopay increases. This is a specification comparison, not an authenticated product test. README line 175 also still calls failed-reservation group compensation unrecorded despite its dated proof. | Describe the specific merchant-booking revision with difference-only holds, distinguish proposed operator routing, and remove the stale release-gate sentence. |

No P0 was established in the exercised checks. Passing the existing suite does not rule out the new failed-authorization-verification case. The panel made no product fixes or provider transactions.

## Method, readiness and limits

The coordinator made a frozen git archive, withheld prior judging/remediation, installed 19 packages from the local npm cache with fresh `npm ci --offline`, built the production UI, and served a separate credential-free simulator at localhost:3801. Included source files remained byte-identical to the pinned commit. GitHub verified the repo as PUBLIC, `main` as the reviewed commit at review time, and its CI successful. Private gitignored filming/submission drafts were supplied as a separately hashed supplement and were not published.

**Design interaction is partial.** Automatic approval review rejected the first simulated authorization, asking for explicit human permission. That permission remained unanswered. The design judge did not bypass the rejection; subsequent payment journeys are source-inferred/recorded in that report, while the technical journey was independently exercised with fixtures. This tool limitation was not scored as a product defect. The previous 375px post-confirmation overflow state was therefore not interactively rechecked in this panel.

Basic viability and meaningful PayPal/AI use are supported. Submission completeness remains conditional because the required finished public video is missing. Interviews and hosting are not mandatory submission requirements; interviews remain deferred at the owner’s request. Provider records, model evaluations, UI observations and fixture results are distinct forms of evidence. No combined continuous filmed AI-to-sandbox journey or real operator integration was established.

## Reports and reproducibility

- [Technical report](technical/report.md), [scores](technical/scores.json), [repro harness](technical/repro.mjs), [output](technical/repro-results.json), [payment-source hashes](technical/evidence-hashes.json).
- [Design report](design/report.md), [scores](design/scores.json), [screenshots](design/screenshots/04-mobile-allocation.jpg).
- [Impact report](impact/report.md), [scores](impact/scores.json), [summary repro](impact/repro-summary.mjs), [output](impact/repro-summary.json), [baseline](impact/local-baseline.txt).
- [Coordinator checks](moderator-checks.json), [manifest](manifest.json), [rubric](RUBRIC.md), [aggregate JSON](scores.json).

Harnesses import the manifest’s frozen snapshot path. If it is removed, recreate that directory from `git archive 0ce5ebecd2b93dfb7dad317c2332a3433f86f973`, excluding prior judging as listed in the manifest, or update the harness paths to an equivalent isolated snapshot. No credentials are needed. Private supplements are unnecessary to reproduce the code checks. Preserve the original repo’s live sandbox records; do not use them for these fixtures.
