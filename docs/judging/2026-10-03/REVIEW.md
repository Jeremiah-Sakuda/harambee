# Harambee — panel assessment

**61.7/100**, averaging three independent mock judges. Individual totals: **61–62/100**. This is an assessment of commit `7adc9688598caba0f96916b52141a8051620eec8`, not an official result or prize prediction.

Harambee has a coherent, working group-consent simulator. The panel consistently valued versioned approval, explicit top-ups after a dropout, capped allocation, and visible recovery. Its largest weakness is that the complete group journey does not yet run through PayPal: the sandbox lab is a separate single-payment workflow. The AI interpreter is also unverified with a real provider and has not demonstrated an advantage over manual entry.

## Independent scorecards

Each criterion is scored /10 and weighted equally. Total = 2 × the five scores. Averages use unrounded values; displayed values are rounded to one decimal.

| Judge | Technology | Design | Impact | Innovation | Presentation | Total /100 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Technical](technical.md) | 6.0 | 7.5 | 6.0 | 6.5 | 4.5 | 61 |
| [Product/design](design.md) | 6.0 | 7.0 | 6.0 | 6.5 | 5.5 | 62 |
| [Impact/innovation](impact.md) | 6.5 | 7.0 | 6.0 | 7.0 | 4.5 | 62 |
| **Panel mean** | **6.2** | **7.2** | **6.0** | **6.7** | **4.8** | **61.7** |

Scores were submitted before judges saw any peer feedback. The narrow total range is agreement on this rubric, not a statistical confidence interval. Design and presentation differ because the design judge actually completed the browser flow; the other two inspected source and supplied visual evidence. Technical/design readiness was conditional; the impact judge considered API-use evidence insufficient. The moderator has preserved both assessments.

## What was demonstrated

- The technical judge ran **27 passing tests** and a successful production build; the impact judge independently ran the tests. The coordinator also built the frozen snapshot. No clean dependency installation was performed during this review.
- The design judge completed revised-share consent, a simulated booking, and a two-pass refund recovery; inspected the 390px mobile board; and saved seven screenshots in [the design report](design.md).
- The technical judge produced four isolated reproductions, which the coordinator independently reran successfully. [Run the reproduction script](technical-repro.mjs) against this pinned checkout; all provider responses are mocks.
- No actual PayPal or model-provider request was made. A working simulator, adapter source, and mocked tests are distinct forms of evidence.

## First fixes and evidence to collect

| Priority | Finding and evidence | Smallest convincing resolution |
| --- | --- | --- |
| P1 | **A saved ceiling can be overwritten when review opens from Organizer.** The design judge saved Jordan's $100 ceiling, reopened review, observed the field default to $220, accepted the current $100 share, and later saw a $200 allocation after a withdrawal. [Review initialization](https://github.com/Jeremiah-Sakuda/harambee/blob/7adc9688598caba0f96916b52141a8051620eec8/src/main.jsx#L171). | Load the participant's own projection before initializing the field; preserve saved ceilings. Separate saving a lower budget from approving an existing share. Regress the exact role-switch sequence. **Fresh consent is still required; no unauthorized extra charge was observed.** |
| P1 | **Recovery can report completion with a persisted pending void.** Replaying an actual emitted snapshot leaves `void_pending`/`pending`, yet returns `cancelled` and a completed-recovery audit. [Recovery code](https://github.com/Jeremiah-Sakuda/harambee/blob/7adc9688598caba0f96916b52141a8051620eec8/server/domain.mjs#L501). | Reconcile pending voids and require every financial operation to reach a confirmed terminal state before completion. Test restarts at saved transition boundaries. This was a simulator snapshot replay, not loss of real funds. |
| P1 | **Sandbox reconciliation offers an action that remains blocked.** Mocked capture timeout followed by an authorization still marked `CREATED` yields session `authorized`, but its capture operation remains `unknown`. [Reconciliation](https://github.com/Jeremiah-Sakuda/harambee/blob/7adc9688598caba0f96916b52141a8051620eec8/server/sandbox-lab.mjs#L77). | Keep session, operation history, and available controls consistent. Offer investigation guidance when the outcome is unknowable; never blindly issue a replacement charge. |
| P1 | **Quote provenance is not semantic validation.** Two judges independently supplied a valid source quote with a wrong extracted amount; the adapter accepted it. The local parser also reads `$1,000` as `$1`. [Validation](https://github.com/Jeremiah-Sakuda/harambee/blob/7adc9688598caba0f96916b52141a8051620eec8/server/ai.mjs#L107). | Flag amount/attribution conflicts, parse common monetary notation conservatively, and preserve manual confirmation. Run a frozen evaluation with actual provider outputs and compare correction effort to the baseline. This is a validator limitation, not evidence that a real model produced the mocked error. |
| P1 | **Group-payment feasibility remains unproved.** The lab is explicitly separate. [Documented boundary](https://github.com/Jeremiah-Sakuda/harambee/blob/7adc9688598caba0f96916b52141a8051620eec8/README.md#L70). | Connect one three-buyer sandbox trip to the versioned coordinator; show a dropout, revised approval, capture, and recovery with provider IDs. Keep fixture lodging clearly labeled. |
| P2 | **Recovery totals and mobile hierarchy reduce clarity.** A pending refund coexists with a headline showing only $0 held; mobile financial detail uses 7–10px text. | Show separate held/captured/refund-pending/returned totals. Use stacked participant cards with readable text and larger controls. See observed screenshots and exact source references in [design.md](design.md). |

No judge assigned P0. The supported main simulated flow works; these findings do not establish that every recovery case is broken.

## Impact and presentation work

Observe a small group of real organizers/participants using the revised-share flow. Measure assistance, completion time, and whether they understand held versus charged funds. Test whether capped allocations feel acceptable to the group. Obtain one merchant feasibility discussion about separate buyers, inventory timing, and recovery costs. These are proposed experiments, not evidence already collected.

The 2:45 script and documentation are useful, but no recorded demo was supplied. Record one clear end-to-end story, explicitly distinguish simulation and provider execution, and show the revised consent that makes the concept distinctive. All judges scored missing video as a presentation gap rather than zeroing unrelated criteria.

## Readiness and next iteration

The original repository was independently confirmed **private**. A license and local setup are present; a public repository and public video remain submission gaps. Hosting is optional under the [official rules](https://paypalaihackathon.devpost.com/rules). Provider-use evidence is not sufficient for this panel to assure passage through stage one; the organizer decides eligibility.

Recommended order: repair the ceiling and unresolved-operation behavior; prove one integrated sandbox scenario; evaluate actual model output; observe a small user session; record and publish the submission materials. Add no new cabin catalog or broad travel features before those proofs.

Full individual feedback: [technical](technical.md), [design](design.md), [impact/innovation](impact.md). Machine-readable scores are stored beside each report. The panel evaluated only this repository and did not rank it against sibling projects.
