# Harambee — independent impact, innovation, and pitch review

This is a simulated judge assessment, not an official decision or prize prediction.

## Scope and method

- **Repository:** Harambee, isolated snapshot `/private/tmp/paypal-judge-20261003/harambee`.
- **Assigned pinned commit:** `7adc9688598caba0f96916b52141a8051620eec8`. The supplied snapshot has no `.git`, so `git rev-parse HEAD` could not independently confirm provenance; the assigned commit is used as the review identifier.
- **Persona:** Impact/innovation/pitch judge. Evaluated the existing artifact against all five equally weighted criteria in the supplied protocol.
- **Read:** README, proposed PRD, demo outline, hackathon evidence plan, browser QA document, relevant React interface code, domain engine, AI adapter, PayPal adapter, server routes, tests, and MIT license. Visually inspected the supplied `docs/preview.png`.
- **Executed:** `npm test` from the isolated snapshot: **27 passed, 0 failed**. Ran an in-process mocked-model reproduction described below, with `fetch` replaced before interpretation and no external request. File/line references were read using `nl -ba` and `rg`.
- **Limitations:** No live browser flow or fresh responsive inspection in this persona; the screenshot is supplied artifact evidence, and `docs/BROWSER_QA.md:3–12` is the builder's reported QA rather than my observation. No build or clean dependency installation performed; snapshot dependencies reuse the original `node_modules`. No payment/model providers contacted. No source or original demo changed. No video supplied; repository is private according to the assignment. No interviews, observed target-user sessions, or independent market research supplied. No claim that this idea is first or unique in the market.

## Scores

| Criterion | Score /10 |
| --- | ---: |
| Technological Implementation | 6.5 |
| Design | 7.0 |
| Potential Impact | 6.0 |
| Innovation/Idea | 7.0 |
| Presentation | 4.5 |
| **Equal-weight total** | **62/100** |

### Technological Implementation — 6.5/10

The coordinator is materially more developed than a payment button attached to a travel mockup. It checks exact current-version agreement and authorization coverage, records operation keys before results, allocates integer cents with budget caps, and requires fresh consent after withdrawal (`server/domain.mjs:42–69`, `175–212`, `214–267`, `280–338`). The passing tests substantiate the simulator's $150-to-$200 revision and $50 top-ups, duplicate prevention, several recovery scenarios, deadlines, and private field projection (`test/domain.test.mjs:58–87`, `89–169`). However, the complete trip's authorizations are explicitly generated `SIM-AUTH` values (`server/domain.mjs:256–260`). PayPal integration is a separate single-payment feasibility lab, with useful authorization/capture/refund adapter methods but no demonstrated multi-buyer trip execution (`server/paypal.mjs:1–2`, `48–104`; `README.md:58–70`). AI has a genuine structured-output adapter, timeout, and provenance validation, but no verified provider execution or usefulness evaluation (`server/ai.mjs:68–137`). This earns solid prototype credit while leaving the two central sponsor integrations insufficiently demonstrated as one product.

### Design — 7/10

The supplied desktop screenshot communicates a specific trip, total price, approval progress, and held-versus-charged distinction with a consistent visual hierarchy. The source supports explicit version and exact-share review, additional-hold disclosure, cancellation terms, and a confirmation that nothing has been charged (`src/main.jsx:1001–1074`). Those decisions make the financial consent mechanism understandable, rather than hiding it behind an attractive dashboard. The separate notes and receipts surfaces also form a coherent demo. My score is bounded by static/source inspection: I did not independently prove mobile usability or the entire browser interaction. More fundamentally, one judge switching among roles does not establish a participant invitation/join experience. Roles come from a client-supplied demo header (`server/index.mjs:61–67`), and the product openly describes that as non-authenticated (`README.md:82`). The notes-to-decision handoff is also manual: suggested ceilings tell the user to confirm elsewhere rather than opening a focused review flow (`src/main.jsx:692–695`).

### Potential Impact — 6/10

The audience is unusually concrete: someone organizing a cabin for three to eight friends, with different budgets and a risk of somebody withdrawing (`PRD.md:11–15`). The proposed benefit—avoid making one organizer front the entire booking—is understandable without speculative market size. The demonstrated simulator addresses a meaningful piece of that problem: it prevents a dropout from silently increasing everyone else's charge and can show what happens after partial collection. Yet the financial benefit is still conditional on a merchant accepting separate buyer payments and reservation timing, which the fixture cannot validate. The README explicitly claims no real reservations, payment success, fee economics, or user impact (`README.md:86–88`). There is also no observed evidence that participants will complete initial authorization and a second approval quickly enough to beat a booking deadline. The PRD's five organizer interviews and comprehension targets remain proposed (`PRD.md:15`, `88–98`). I credit a plausible, well-scoped problem/solution mechanism, not demonstrated time savings, uptake, or avoided losses.

### Innovation/Idea — 7/10

The most persuasive idea is **renegotiation tied to explicit financial consent**. A changed group creates a new plan; capped allocation respects declared limits; a remaining participant authorizes only the additional amount; the group cannot book on old approvals (`server/domain.mjs:175–187`, `214–260`, `300–337`). The alternative $170/$215/$215 split gives this mechanism more substance than an equal-split animation (`test/domain.test.mjs:20–31`). This is a credible differentiated demonstration relative to a simple bill-splitting concept, without asserting anything about researched competitors. AI contributes less to the present distinction: it extracts notes into drafts, while deterministic code performs the useful reallocation and users enter budgets separately (`server/ai.mjs:79–80`; `server/domain.mjs:309`; `src/main.jsx:692–695`). Keeping the model out of payment authority is appropriate. The missing evidence is that interpretation reduces coordination effort or resolves ambiguity better than the existing manual path—not that the model should control money.

### Presentation — 4.5/10

The materials are candid and easy to follow. README walkthrough steps present the four-person booking, dropout, revised consent, booking, and recovery in a logical sequence (`README.md:35–44`). The 2:45 outline has a real narrative turn and reserves time for failure recovery and integration boundaries (`DEMO.md:3–9`). The screenshot shows a polished artifact. However, an outline is not a recorded demonstration, and the repository expressly says that no recording, public video, interviews, hosted deployment, or live provider evidence has been created (`DEMO.md:11`). A judge who relies only on submitted video cannot see the end-to-end behavior. The current proposed opening is strong; the closing needs a demonstrated outcome plus honest scope. The proposed PRD's AI-driven revision language (`PRD.md:5`, `31`, `70`) should not be lifted into the pitch as implemented behavior, because current revisions are deterministic and AI is an optional notes interpreter.

## Strengths worth preserving

1. **Consent is the product mechanism.** Exact version/share approval, visible additional holds, and refusal to book an outdated group give the demo a memorable reason to exist (`server/domain.mjs:214–267`; `test/domain.test.mjs:58–87`).
2. **Failure has a user-facing story.** Unknown capture and pending refund scenarios support a more credible payment pitch than a happy path alone (`README.md:40–41`; `test/domain.test.mjs:100–143`). These remain simulator evidence.
3. **A constrained budget changes the actual allocation.** $170/$215/$215 is easy to inspect, sums correctly, and provides a strong explanation of feasibility (`test/domain.test.mjs:20–31`).
4. **Claims are labeled.** The README distinguishes simulator, local parser, optional model, and separate sandbox lab, preserving trust and allowing precise judging (`README.md:7`, `52–54`, `68–70`).
5. **Audience and scope are narrow enough to test.** One merchant and small friend groups are a reasonable hackathon focus; broader travel search is unnecessary (`PRD.md:13`, `19`, `82–84`).

## Key findings and evidence status

**Observed: quotation matching does not validate the extracted budget's meaning.** In a disposable Node process, imported `interpret` from `server/ai.mjs`, set a dummy key, and replaced `globalThis.fetch` with a completed mock Responses payload. Input was `Maya: Maximum $170`. The mock returned that exact source and line 1, but `budgetCents: 22000`, `needsReview: false`, and preference `Maximum budget $220`. Interpretation returned the constraint as `provider: "openai"` without fallback. The validator checks the quote exists and the number is within bounds, not that the amount follows from the quote (`server/ai.mjs:107–122`). The UI would render the suggested $220 ceiling and “Ready to review” (`src/main.jsx:679–695`). This does **not** prove the actual model makes that error, and it cannot directly authorize money: the user still reviews and confirms separately. It does mean “source-checked output” must not be presented as semantic accuracy. Reproduce using the mock structure in `test/ai.test.mjs:20–68`, keeping the source authentic while substituting the numeric interpretation.

**Source-inferred: the adoption loop stops at the demo role switch.** The proposed real loop is organizer chooses cabin → friends join and approve → all commitments permit booking → successful trip encourages reuse. Current code covers simulated middle transitions, but the server trusts `x-demo-actor`, there is one current trip, and new plans use fixed dates (`server/index.mjs:61–67`, `146–165`; `src/main.jsx:1180–1183`). This is an acceptable demo shortcut, but no real group onboarding or repeat-use evidence should be claimed.

**Source-inferred: the notes interpreter is optional to the main value.** The interpretation endpoint returns a draft directly, while revision invokes the engine separately (`server/index.mjs:174–175`, `189–190`). Current notes cannot plan attendance, choose rooms, or automatically generate a usable renegotiation proposal. The narrow present role should anchor the AI pitch.

## Prioritized improvements

No P0 is assigned: I did not observe a broken core simulator demonstration. The main weaknesses are integration and evidence, not a demand for production maturity.

| Priority | Concrete next action | Why it matters / completion evidence |
| --- | --- | --- |
| P1 | Record and publish a real sub-three-minute walkthrough following `DEMO.md:3–9`, including one visible participant approval, dropout, new approval, booking receipt, and a separately labeled recovery case. | Repairs the largest presentation gap. Label prepared approvals and simulator/provider boundaries on screen; the outline alone proves no behavior. |
| P1 | Exercise the sandbox lab with real sandbox credentials, then connect at least three independent buyers to one trip's coordinator, including a revised top-up and one controlled recovery case. | The benefit requires multi-buyer payment coordination, while `README.md:70` describes only separate feasibility. Preserve provider IDs and reconciliation evidence; do not treat a lab success as a funded cabin. |
| P1 | Run five recent-organizer interviews and one facilitated group session, using the concrete dropout scenario. | Establish whether fronting deposits is frequent and important. Report number affected, existing workaround, approval completion time, assistance, and confusion about holds/charges/refunds; no invented savings. This executes `PRD.md:15`, `95`. |
| P1 | Demonstrate AI on a frozen set of clear, ambiguous, and conflicting notes, comparing correction effort to manual entry/local parsing. Include at least one genuine provider response. | Tests whether AI earns its place. Use the proposed 12-brief design (`PRD.md:94`), retain raw outputs and failures, and measure user corrections—not just schema success. |
| P1 | Make one participant joining and reviewing their own commitment independently demonstrable. | The role switch hides the user acquisition and coordination burden. A minimal scoped join/session flow and a second browser are enough for the next proof; a full account platform is unnecessary. |
| P2 | Add a contradiction fixture for authentic source text with the wrong extracted amount; flag inconsistencies and always require explicit confirmation of any suggested ceiling. | Addresses the reproduced semantic-validation gap at `server/ai.mjs:107–122` without granting the model payment authority. Show source and amount together, and avoid implying provenance validation proves meaning. |
| P2 | Add an explicit review handoff from each notes draft to that participant's budget review, with the proposed value visibly pending until accepted. | Reduces manual copying between `src/main.jsx:692–695` and `1025–1054`; preserves consent while making the AI output useful. |
| P2 | Test the capped split with participants and expose the fairness rule before approval. | An affordable split is not necessarily perceived as fair: one person pays $170 while others pay $215. Record whether the group accepts it and whether private-budget concerns arise. Do not claim hiding the raw field prevents inference from the resulting shares. |
| P2 | Add one merchant feasibility note based on a real operator discussion: who receives separate payments, when inventory is held, and who bears recovery cost. | Makes the path from local fixture to usable product credible. These are already unresolved research questions in `PRD.md:19–23`, `106–108`, not a reason to build a large merchant platform now. |

## Stage-one and submission readiness

**Mock assessment: insufficient evidence.** Theme alignment is clear and meaningful PayPal/AI source adapters are present, but the supplied artifact demonstrates the full journey through a simulator and no completed provider execution. I cannot affirm the required API-use screen on this evidence alone. This is not an organizer eligibility decision and has not been converted into automatic zero product scores.

- **Present:** runnable local setup instructions (`README.md:9–33`), source, original fixture assets, 27 passing tests, MIT license (`LICENSE:1–21`), clear simulation disclosures.
- **Submission gaps:** original repository remains private according to the assignment; no public YouTube video supplied or produced (`DEMO.md:11`). Publication and a recorded demo are required under the supplied protocol.
- **Integration evidence gaps:** actual model response and actual sandbox transaction evidence absent; group coordinator remains separate from sandbox lab (`README.md:7`, `70`).
- **Hosting:** not configured, but local setup is allowed by the protocol; lack of hosting alone is not a submission defect.
- **Not required for this hackathon score:** a production financial service, distributed database, broad merchant catalog, or completed business model. Those should not displace a credible small integrated demonstration.

## Top three judge questions

1. Can three distinct buyers authorize and complete this same versioned trip through PayPal sandbox, and can you show what happens when one buyer leaves or one capture fails?
2. What did actual organizers and participants do differently because of Harambee, and where did they need help understanding holds, top-ups, or refunds?
3. Which decision became easier because of AI, compared with entering budgets manually, and how do you detect a correct quote paired with an incorrect interpretation?

## Smallest credible next iteration

Keep the two cabins, fixed stay, and existing simulator. Finish one integrated three-buyer sandbox trip with exact consent and an inspectable receipt, plus a separate recovery demonstration. Add one genuine source-linked model interpretation and a tiny clear/ambiguous/conflicting evaluation, retaining explicit manual confirmation. Observe one group using the revision flow and report every assisted step. Then record the existing 2:45 script and publish the source/video. If group sandbox integration cannot be completed, retain the honest “simulated coordinator plus separate feasibility lab” claim and make that limitation explicit in the recording; it improves presentation but does not establish the core real-payment impact.
