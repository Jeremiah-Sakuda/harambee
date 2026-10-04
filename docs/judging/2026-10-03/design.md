# Harambee — independent product/design/demo judge

**Mock score: 62/100.** A coherent, attractive group-payment simulator makes versioned consent tangible. Its strongest evidence is the working approval, revised-share, booking, and recovery journey. The main weaknesses are a reproducible saved-budget overwrite in the demo review flow, incomplete financial summaries during recovery, and the absence of demonstrated PayPal/AI integration in the central journey.

## Scope and method

- Project: Harambee, pinned commit **7adc9688598caba0f96916b52141a8051620eec8**.
- Persona: independent product/design/demo judge; all five criteria scored independently.
- Source inspected: `/private/tmp/paypal-judge-20261003/harambee` only. The supplied snapshot contains no `.git`; `git rev-parse HEAD` therefore failed. Commit attribution comes from the evaluation assignment, not an independent Git verification.
- UI: isolated `http://127.0.0.1:3201`, desktop at the existing 1280×720 viewport and mobile at 390×844. Temporary viewport override was restored. Only this isolated synthetic trip was mutated.
- Method: browser screenshots and DOM inspection, actual UI interaction, and line-numbered source/documentation reads using `rg`, `nl`, and `sed`. Applied the UI/UX skill's accessibility, touch-target, responsive, and error-feedback guidance, including its targeted `error summary validation` search.
- Verified flows: first authorization; saving a lower ceiling; publishing revised allocations; individual reapproval with explicit top-up; successful simulated booking and receipts; local parser output; unconfigured sandbox view; reset; a second budget-overwrite reproduction; participant withdrawal; new-version approvals; pending-refund scenario and two recovery passes.
- Not performed: live provider requests, source edits, dependency installation, tests/build, recorded-video review, user research, external market comparison, or a complete screen-reader/keyboard audit. Dependencies are the supplied reused installation, not an independently clean install. No sibling source, peer reports, or prior build discussion informed these scores.

Evidence labels below mean **Observed** in this browser run, **Source** corroborated by implementation, **Unverified integration** for adapters not exercised against providers, and **Presentation evidence** for actual materials supplied. Source references are repository-relative and use verified line numbers.

## Scores and rationale

| Criterion | Score /10 | Rationale in brief |
|---|---:|---|
| Technological Implementation | 6 | Substantial working simulator; provider integrations remain separate and unverified |
| Design | 7 | Distinct, understandable complete flow with budget and recovery-state weaknesses |
| Potential Impact | 6 | Specific coordination problem; no observed adoption or real booking evidence |
| Innovation / Idea | 6.5 | Consent revisions and recovery are the strongest mechanism; AI value remains peripheral |
| Presentation | 5.5 | Clear UI/docs and honest scope; recording and public submission evidence missing |
| **Total, equally weighted** | **62/100** | **2 × (6 + 7 + 6 + 6.5 + 5.5)** |

### Technological Implementation — 6/10

**Observed:** This is more than a static design. The app moved from $150 shares to a capped allocation of $166.67/$100/$166.67/$166.66, retained Maya's original $150 hold, requested only a $16.67 additional hold, required all four version-2 approvals, and then showed $600 captured and a committed local reservation. In a second sequence, a refund stayed pending after the first recovery and settled after the second. **Source:** version checks and distinct consent/authorization handling are at `server/domain.mjs:214–267`; revised allocations at `server/domain.mjs:300–338`; recovery at `server/domain.mjs:448–515`; atomic local snapshot replacement at `server/store.mjs:17–22`. The budget-review default defect described below materially weakens correctness of a core input. **Unverified integration:** the PayPal adapter has sandbox-only requests and operation APIs (`server/paypal.mjs:1–105`), and the model path has structured output and quote checking (`server/ai.mjs:32–138`), but neither provider was exercised. The main trip is explicitly simulated, the sandbox lab is separate, and the observed notes path was a local parser. That supports a credible prototype score rather than a strong integrated-payment score. I did not independently execute the test suite and do not count README test claims as my verification.

### Design — 7/10

**Observed:** Forest green, warm neutral surfaces, a distinctive cabin illustration, restrained iconography, and a clear commitment board form a cohesive product. The exact share, incremental hold, version number, and simulation disclosure are presented at the approval point. After success, a clear route leads to inspectable receipts. Native dialog semantics, visible labels, and a progressbar are present; source also provides focus styles and reduced-motion support (`src/main.jsx:984–1035`, `src/main.jsx:830–840`, `src/style.css:58–65`, `src/style.css:1775–1782`). At 390px, the inspected board had no horizontal page overflow: `scrollWidth` and viewport width both measured 390. However, the mobile board achieves fit partly through 7–10px labels/status text. The budget-changing flow uses an approval button to save a ceiling and then return a revision error, and reopening from another identity can overwrite that ceiling with a default. Recovery exposes detailed truth in rows but offers an incomplete summary. These affect comprehension and trust in the product's central promise, so visual polish alone does not justify an 8–9.

### Potential Impact — 6/10

The audience and problem are specific: a small friend group wants to commit to one cabin without one member fronting the entire amount. **Observed:** individual approvals, explicit revised shares, and recovery records demonstrate plausible reductions in coordination ambiguity. **Source:** the app is limited to one current trip, fixed dates, local cabin fixtures, and a demo identity switch; the README explicitly states these constraints and lacks a claim of completed research (`README.md:44`, `README.md:54`, `README.md:82–88`). Actual reduction in chasing, abandoned bookings, disputes, or organizer financial exposure is therefore a hypothesis. A successful simulation does not demonstrate that merchant inventory, multiple payer authorizations, timing, and recovery work together in a real purchase. A small study with organizers and participants, paired with one real sandbox group trace, would be more persuasive than broader aspirational use cases.

### Innovation / Idea — 6.5/10

The strongest idea is the combination of capped allocations, immutable plan versions, explicit incremental approval, and recovery after partial payment collection. **Observed:** a participant's old hold was retained while a separately disclosed top-up needed new consent; the failed-booking scenario ended in a verifiable no-booking settlement. This gives the group-planning concept a clear mechanism. **Source:** changing roster or cabin requires a new version (`server/domain.mjs:300–338`), and model output has no payment tools (`server/ai.mjs:79–90`). **Observed limitation:** preference extraction produced source-linked cards but no direct clarification or confirm-in-review action; users must navigate away and re-enter the ceiling manually (`src/main.jsx:676–698`). AI is therefore an optional interpretation layer rather than the demonstrated reason the central workflow works. I make no market-first claim: no competitor research or defensible novelty evidence was provided or undertaken.

### Presentation — 5.5/10

**Presentation evidence:** the product states its purpose quickly, visually tells a consistent story, repeatedly identifies simulation, and supplies runnable setup instructions and an appropriately scoped 2:45 recording outline (`README.md:7–30`, `DEMO.md:1–11`). The documentation cleanly distinguishes local-parser output, optional model output, and a separate PayPal sandbox feasibility lab. This honesty improves credibility. **Missing evidence:** no recorded video was supplied, and the original repository is private according to the review assignment. A recording outline is not a demonstrated pitch: timing, narration, end-to-end continuity, and clarity to a judge who never runs the project remain unknown. The three-minute story also has to cover many state transitions; the present materials have not proved that this can be done legibly. Those are direct presentation and submission gaps, not grounds for zeroing the working product's other categories.

## Findings and prioritized improvements

No P0 was observed: a complete simulated happy path and a recovery path both worked. The following priorities reflect judging significance, not production incident severity.

### P1 — Preserve a participant's saved ceiling when opening review

**Observed reproduction:**

1. Reset the isolated fixture. From Organizer, Review Jordan, replace $220 with $100, and press **Agree & authorize simulated hold**.
2. The modal reports **Publish a revised plan before approving.** Close it, return to Organizer, and publish revised shares. Jordan now has a $100 share, proving the $100 ceiling affected allocation.
3. From Organizer, Review Jordan again. The field is now **$220**, even though the saved lower ceiling produced this $100 share.
4. Accept without editing. Only the current $100 share is authorized, but the budget also saves as $220.
5. Withdraw Sam and publish version 3. The remaining three now receive $200 shares. Switch to Jordan first, then open **Review my $200 share**: the persisted ceiling is $220 and the modal asks for a new $100 top-up.

**Source cause:** the Organizer projection intentionally omits private ceilings (`server/domain.mjs:533–536`). `review(p)` sets the participant identity but immediately initializes the field from the previous projection, defaulting to 220 (`src/main.jsx:171–178`); the later participant fetch does not reinitialize it. Approval always posts this field to `budget` before posting consent (`src/main.jsx:1049–1062`), and the budget mutation writes the value (`server/domain.mjs:340–350`).

**Boundary:** this is an observed ceiling overwrite and later allocation increase. It is not a privacy-projection leak, an automatic charge increase, or a bypass of consent: version 3 still required explicit reapproval. Fix by loading the selected identity's state before initializing review, preserving known values, and using an empty required field for truly unknown ceilings. Add a focused regression covering the exact organizer-to-participant review sequence. This is core to the “Your budget stays yours” promise.

### P1 — Make saving a lower ceiling an understandable state transition

**Observed:** entering $100 against a $150 share and clicking the approval CTA persisted the budget, left the modal open, and returned “Publish a revised plan before approving.” The same approval button remained available. The participant has made useful progress, but the UI frames the result solely as an error and supplies no direct next-step action inside the modal. **Source:** two sequential calls at `src/main.jsx:1049–1062`; budget can change status to revision-required at `server/domain.mjs:346–348`; approval rejects at `server/domain.mjs:215–218`. Separate **Save my budget / request revised share** from **Approve this share**, explain that the budget was saved, and show that the organizer must publish a revision. Connect validation messages to the field rather than relying only on a generic alert.

### P1 — Show refund exposure in the recovery summary

**Observed:** after the first pass of **Refund needs a second recovery**, the sidebar showed **$0 held, not charged** while Jordan's row showed **$100 to return** and recovery was still pending. Other active rows said **Release hold** even though that first recovery had already voided their holds. The second recovery correctly changed the plan to **All settled. No booking.** **Source:** the summary displays captured funds only for confirmed bookings, otherwise held funds (`src/main.jsx:842–849`). Recovery row text falls through to “Release hold” whenever there is no unresolved capture amount (`src/main.jsx:480–486`). Show separate totals for held, captured, refund pending, and returned amounts; derive each row label from its actual payment state. Preserve the honest pending state, but make the remaining financial exposure visible without inspecting a ledger.

### P1 — Demonstrate the required integrations as one coherent claim

**Observed:** Planning notes explicitly used the local parser; the sandbox view was unconfigured with disabled order creation. **Unverified integration:** source implements provider adapters, but the separate lab never funds the group trip (`src/SandboxLab.jsx:54–59`; `README.md:68–70`). Demonstrate a genuine sandbox authorization/capture/refund with provider IDs, then connect multiple participant approvals to the group coordinator or narrow the submission claim accordingly. Show one model-enabled, source-checked interpretation and one ambiguous case. Keep deterministic amounts and explicit consent. This is the biggest route to a higher technology score and firmer stage-one confidence.

### P1 — Supply the actual public submission materials

Record the under-three-minute video using the script, showing the exact screens rather than claiming that the script is evidence. Include one revised-share approval, one recovery result, and a clear statement of which provider calls are genuine. Make the repository public when the owner is ready to submit and verify access from a signed-out session. Preserve the existing MIT license (`LICENSE:1–21`) and setup commands. Hosting is optional under the supplied rubric; its absence is not treated as a required-submission failure.

### P2 — Use mobile hierarchy instead of miniature desktop text

**Observed at 390×844:** no horizontal overflow on the board; a coherent single-column layout remains. However, the financial table and disclaimer text are tiny. **Source:** mobile names are 10px, status is 8px, commitment detail is 7px, and table headers are 7px (`src/style.css:1571–1602`). The observed New trip control measured 26px high; source sets review controls to 36px and withdrawal to 32×36px (`src/style.css:1610–1617`). Render each participant as a compact stacked card with readable share, state, and action text; aim for approximately 14–16px essential body text and 44px action targets. Keep decorative content secondary so the next approval action and summary are easier to reach. This is a readability/touch recommendation, not a claim that all accessibility criteria were formally audited.

### P2 — Close the preference-to-consent loop

**Observed:** “Needs clarification” is informational only, while “Suggested ceiling: $220 · confirm it in your participant review” asks the user to remember and re-enter information. **Source:** preference cards contain text only (`src/main.jsx:676–698`); the local parser reproduces each note and flags uncertainty with simple matching (`server/ai.mjs:1–30`). Add a participant-scoped **Review this suggestion** action, show the source quote next to a proposed editable ceiling, and require explicit confirmation. Provide a clear path to resolve a flagged ambiguity. Do not let interpretation silently set payment amounts. Measure whether this saves time compared with typing a ceiling directly.

### P2 — Support the impact claim with a small observed study

Have three to five actual trip organizers and participants complete a budget change and a dropout scenario. Report completion time, misunderstood states, and whether each can explain what is held versus charged. This would directly challenge the product's assumptions; no interviews, conversion benefit, or quantified impact should be invented in the submission. The README already acknowledges the missing research (`README.md:54`).

## Strengths to preserve

- Exact share, incremental hold, version, and simulation disclosure appear together at consent (`src/main.jsx:1003–1079`).
- Revised consent remains necessary even when a prior hold exists; the observed ceiling bug did not bypass it.
- The pending-refund scenario resists premature success, and receipts retain individual operations and attempts (`src/main.jsx:754–781`).
- The visual language is distinctive and internally consistent without depending on external photography; the cabin is inline SVG (`src/main.jsx:41–109`).
- Documentation and the UI are unusually explicit about simulated payments, local fixtures, parser fallback, and remaining provider gates. Keep that transparency when adding integration evidence.

## Stage-one and submission readiness

**Conditional — mock assessment, not an organizer decision.** Theme fit is clear and the local product is functional. Relevant PayPal and AI adapters exist in source, but reasonable use of the required APIs in the submitted experience is not yet demonstrated by this no-credential run. The final judgment depends on organizer interpretation and the integration evidence eventually submitted. Current formal submission gaps are the private repository and missing public video; the MIT license and setup instructions are present. A working local demo is demonstrated, and optional public hosting is absent. These readiness issues are kept separate from the product scores above.

Confidence is **medium overall**: high for the reproduced UI findings, lower for provider behavior, real-user impact, and actual pitch delivery. The supplied snapshot identity was not independently verifiable through Git metadata.

## Top three judge questions

1. Can you show multiple genuine PayPal sandbox participant authorizations feeding the same group booking, including recovery after a partial failure, rather than a separate single-payment lab?
2. What does the user understand after changing a ceiling below the current share, and how do you guarantee that the saved ceiling survives entering review from another demo identity?
3. What evidence shows that interpreting planning notes improves group completion or reduces organizer work beyond the versioned consent mechanism itself?

## Smallest credible next iteration

First fix and regression-check the saved-ceiling flow, separate budget saving from consent, and correct the recovery totals. Increase essential mobile text and target sizes without redesigning the visual identity. Then record a short continuous local demonstration plus a clearly separated genuine sandbox/model evidence segment, publish the required repository/video, and run the two tricky states with a handful of participants. Full real-money readiness is a later scope; the immediate judging gain is a trustworthy core demo with verifiable integration boundaries.

## Evidence captures

All captures were created during this evaluation, using synthetic data. They show the isolated simulator, not live provider success.

- [Successful desktop booking and ledger](<design-booking-desktop.png>)
- [Mobile commitment board at 390px](<design-mobile-board.png>)
- [Lower-budget save followed by revision error](<design-budget-error.png>)
- [Saved $100 allocation with review field defaulting to $220](<design-default-ceiling.png>)
- [Later own-identity review showing persisted $220 ceiling](<design-overwritten-ceiling.png>)
- [Refund still pending after first recovery](<design-refund-pending.png>)
- [Second recovery settles the simulated trip](<design-recovery-complete.png>)

![Completed synthetic recovery](<design-recovery-complete.png>)
