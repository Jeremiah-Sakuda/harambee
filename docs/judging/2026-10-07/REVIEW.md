# Harambee — independent judging panel, October 7, 2026

**Panel average: 65.3/100. Readiness: conditional.** This is a simulated three-judge assessment, not an official score, market ranking or prize prediction. Evaluated source: [`4ed2d00`](https://github.com/Jeremiah-Sakuda/harambee/commit/4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b).

Harambee is a coherent group-payment prototype whose strongest feature is a changed agreement: each participant approves the new version and authorizes only their own increase. The panel credited substantive PayPal integration and existing recorded sandbox/model evidence. The major weaknesses are terminal recovery handling, one mobile revision-card defect, missing presentation media, and limited evidence of incremental AI or real-world benefit.

## Independent scores

All judges independently scored all five equally weighted criteria using a 0–10 calibration. Total = twice the sum. The [official rules](https://paypalaihackathon.devpost.com/rules), rechecked October 7, supply the criteria; the numeric scale is ours. These are assessments of the current artifact, with no target score and no prior-score comparison.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical](technical/report.md) | 7.5 | 7.5 | 6.0 | 7.0 | 4.0 | **64** |
| [Design](design/report.md) | 8.0 | 7.5 | 6.5 | 7.5 | 5.5 | **70** |
| [Impact/innovation](impact/report.md) | 7.5 | 7.0 | 6.0 | 6.5 | 4.0 | **62** |
| **Average** | **7.67** | **7.33** | **6.17** | **7.00** | **4.50** | **65.3** |

All three assigned conditional readiness and medium confidence. The six-point difference in presentation reflects how much credit reviewers gave the working UI, written pitch and private filming plan while the actual video remains absent. No scores were negotiated or changed by the coordinator.

## What earns credit

- **The consent mechanism works locally.** The design judge completed four initial $150 holds, a withdrawal, a $170/$215/$215 revised split, exact $20/$65/$65 top-ups and a $600 simulated capture. Old consent did not authorize an increase. The pending-refund scenario required two recovery passes before showing settlement.
- **Provider integration has submitted evidence.** The recorded October 4 sandbox journey is internally consistent: three distinct buyers, one withdrawal void, two $100 top-ups and four completed captures totaling $600. It demonstrates the successful payment path with fixture inventory. The judges did not repeat provider transactions; no recorded PayPal refund-recovery run or combined AI-to-PayPal journey was found.
- **Checks are substantive.** The technical judge ran 84 tests with no failures and offline evaluations at 22/22, 12/12, 8/8 and 6/6. The coordinator installed fresh dependencies from the local npm cache and built the pinned copy. These observations establish local fixture/verifier behavior, not blanket provider correctness.
- **Scope is candid.** The README acknowledges prior art, synthetic evaluation labels, local identity switching, fixture inventory, merchant/platform limits and lack of user studies. The model proposes; code computes and verifies; participants authorize.

## Highest-priority findings

| Priority | Finding and evidence | Concrete next action |
| --- | --- | --- |
| P1 | **Terminal provider failures stay pending.** Technical fixtures make `FAILED` refunds remain `refund_pending` through three recovery passes/restarts. A `DECLINED` capture remains `capture_pending`, leaving its unused authorization unreleased. Coordinator independently reproduced both. See `server/sandbox-lab.mjs:113`, `:123`, `:300`, `:309`; `server/group-payments.mjs:318`. | Persist and display the actual terminal status and provider reason. Add a deliberate, evidence-based resolution path and focused restart regressions. Preserve conservative blocking of uncertain money; do not blindly retry. Supported status values were checked against primary PayPal documentation in the technical report. Exact live response sequences remain fixture-simulated. |
| P1 | **Post-confirmation mobile card overflows.** At 375px, confirming Maya's limit deduplicates an option and produces a long provenance tag; document width becomes 411px, the label clips and the heading becomes a narrow column. Observed by design. See `src/style.css:2057`, `:2068`; `src/RevisionOptions.jsx:212`. | Stack or wrap the title/tag at narrow widths. Verify this exact state after confirmation, not only the initial mobile board. |
| P1 | **The actual presentation video is missing.** All judges found a screenshot and drafts but no current recording or public YouTube URL. The private 2:45 script is a plan. | Record the current journey under three minutes, add captions and accurate real/simulated labels, and publish the required YouTube link. Show what the model adds beyond the standard split. |
| P1 evidence | **AI's advantage is modest and incompletely measured.** Two judges reproduced the current local planner at 23/26 useful and 26/26 safe. Recorded recent model runs score 25/26 and 24/26 useful. The metric accepts any clarification and does not measure explanation quality or user correction effort. | Compare correct, person-specific questions, useful reasons, corrections and time to an approved revision against local/manual planning. Keep the baseline visible and avoid attributing the sample allocation to AI alone. |
| P1 evidence | **Group and merchant benefit remain hypotheses.** No observed participant session or operator interview establishes fairness acceptance, reduced coordination, inventory willingness or viable fees/support burden. | Observe one separate-participant dropout journey and interview one direct-booking operator. Record assistance, consent comprehension, acceptable split, inventory timing and recovery responsibility. |
| P2 | **Persistence disclosure is inaccurate.** Confirmation requests save up to 200 characters of chat to `plan.json`, contrary to “notes never persist.” The coordinator reproduced persistence; another participant's view did not expose the request. See `server/revision-options.mjs:915`; `server/domain.mjs:476`; `README.md:100`, `:194`. | Explain transient full notes versus persisted excerpts, access and retention. Minimize the retained quote if possible. |
| P2 | **Recovery copy and touch size need polish.** A refund already processing retains a generic refund/release action; New trip measures approximately 68×26px on mobile. | Show a pending-specific status-check action; enlarge the control's hit area. See the design report for reproduction and source anchors. |

No judge established a P0 in the exercised core journey. This does not imply exhaustive testing. The technical recovery defects were reproduced with provider doubles, not actual failing PayPal transactions. Honest evidence gaps should not be confused with broken code or mandatory production infrastructure.

## Submission readiness and boundaries

Public GitHub access, the exact reviewed commit and its presence on the default branch were verified by the coordinator. MIT licensing and working local setup are present. Individual reviewers' statements that they did not personally verify public access are scoped limitations, resolved by this coordinator check. Hosting is optional under the rules; its absence is not itself a failure.

The [official rules](https://paypalaihackathon.devpost.com/rules) require a public YouTube demonstration under three minutes. That artifact remains absent. Devpost publication, finished video duration/playback and continuing judge access were not verified. Recorded successful provider evidence is credited without claiming the panel authenticated it independently. User research, merchant adoption and real refund recovery remain unverified.

The coordinator supplied three current private, gitignored pitch/script/checklist drafts as a separately hashed supplement so “as it stands” includes current preparation. No prior review material was supplied. The drafts remain private and were not copied into these published report files. Their existence adds planning evidence, not a completed video. Draft claims and checklist status should be reconciled before publication.

## Recommended sequence

1. Correct the two terminal-state recovery branches and the persisted-excerpt disclosure, with focused restart checks.
2. Repair and verify the 375px post-confirmation layout and pending-refund action copy.
3. Record a current, captioned end-to-end video with explicit AI baseline, sandbox and fixture boundaries. A later separately authorized sandbox compensation run would strengthen the recovery claim.
4. Gather one uncoached group observation and one operator conversation; use those results to sharpen the impact story and decide what additional AI work is justified.

These are recommendations; this panel did not modify application code or initiate provider calls.

## Full reports and reproducibility

- [Technical report](technical/report.md), [score JSON](technical/scores.json), [recovery fixture](technical/recovery-repro.mjs), [output](technical/recovery-repro-output.json), [privacy fixture](technical/privacy-repro.mjs), [output](technical/privacy-repro-output.json).
- [Design report](design/report.md) and [score JSON](design/scores.json), including exact UI journeys, mobile measurements, evidence limits and judge questions. Browser screenshots were inspected during the session but not retained as attachments.
- [Impact/innovation report](impact/report.md) and [score JSON](impact/scores.json), including primary-source comparisons, baseline analysis, merchant questions and private-draft assessment.
- [Manifest](manifest.json), [rubric](RUBRIC.md) and [aggregate JSON](scores.json).

Repro scripts point at the manifest's local frozen snapshot. If it no longer exists, recreate that directory from `git archive 4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b` before running the scripts. Both scripts use isolated synthetic state and make no network/provider calls. Prior judging/remediation was withheld from the review snapshot to prevent anchoring. Original runtime data and the untracked `.claude/` configuration were untouched.
