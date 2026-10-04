# Independent mock judging protocol

These are simulated judge assessments, not official decisions or prize predictions. Each reviewer sees one pinned repository and no sibling projects, prior build conversation, or other judge's findings. All reviews assess the submitted artifact as it exists, not its roadmap.

## Official basis

The [official rules](https://paypalaihackathon.devpost.com/rules), checked October 3, 2026 (local time), specify five equally weighted criteria: Technological Implementation, Design, Potential Impact, Innovation/Idea, and Presentation. The first stage screens theme fit and reasonable use of required APIs. Submission requirements include a functional demo with setup instructions (hosting optional), public GitHub repository, open-source license, and a public YouTube demo under three minutes. PayPal sandbox and AI integration matter to the theme. Separate projects must be substantially different. Judges may rely solely on submission materials.

## Our scoring scale

Score each criterion from 0 to 10 (half points permitted). This numerical scale is our calibration, not one prescribed by the organizer. All five scores have equal weight; total = 2 × sum of scores, out of 100.

- 0–2: missing, unsupported, or fundamentally broken.
- 3–4: recognizable idea with significant execution or evidence gaps.
- 5–6: credible working prototype, with material limitations.
- 7–8: strong, coherent implementation or case, convincingly demonstrated.
- 9–10: exceptional execution and unusually persuasive supporting evidence.

Technological Implementation assesses working depth, correctness, and PayPal plus AI integration. Design assesses a coherent, usable complete experience. Potential Impact assesses a specific audience, problem, and demonstrated ability to help. Innovation/Idea assesses distinctive mechanisms and defensible differentiation; do not claim market novelty without research. Presentation assesses the actual pitch, demonstration, and supporting materials, including video evidence. Credit clear documentation but distinguish a demo script from a recorded end-to-end demo.

Separate submission readiness from product scores. Missing public visibility or video must be reported, not silently treated as automatic disqualification or a zero in all categories. Do not demand enterprise maturity for a hackathon, but flag limitations that undermine a demonstrated core claim. A provider adapter in source is implemented, not independently verified against that provider. Passing unit tests does not prove live integration. Synthetic demos and roadmap features must remain labeled.

## Review boundaries

- Read only your assigned frozen repository. Do not inspect sibling repositories, other reviews, root build summaries, or other agents' history.
- Do not change source or original running demos. Temporary repro scripts and disposable test state under /private/tmp are allowed.
- No live payment/model requests, secrets, external posting, or repository mutations.
- Technical judges should run tests/build and reproduce important behavioral findings where feasible. Report whether observed, source-inferred, or unverified.
- Product/design judges should inspect the actual isolated local UI at the assigned URL, including narrow-screen behavior and one main flow. Use browser skill and UI/UX skill. Do not reset shared browser runtime or other tabs.
- Impact/innovation judges should challenge problem/solution fit, AI necessity, payment relevance, differentiation, evidence, and pitch. Any market claims require sources; otherwise frame as hypotheses.
- Every judge independently scores ALL five criteria, with at least one paragraph of reasons per criterion. Do not synchronize scores.
- Scores reflect the pinned source commit. Snapshot dependencies reuse the original node_modules via symlink; this is not a clean dependency installation.

## Required deliverables

Write your assigned report Markdown and score JSON only in your assigned output directory. Include:

1. Repository, pinned commit, persona, scope/method, commands or flows verified, and limitations.
2. Five-criterion score table with total /100 and detailed rationale for each score.
3. Strengths worth preserving and at least five specific improvements prioritized P0 (core demo broken), P1 (major judging weakness), P2 (polish/evidence improvement). Do not invent a P0.
4. Concrete evidence references using repository-relative file paths and verified line numbers; reproduction steps for defects; distinguish observation from inference.
5. Stage-one readiness as demonstrated / conditional / insufficient evidence (mock assessment, not organizer decision), submission gaps, top three judge questions, and the smallest credible next iteration.
6. JSON: {"project":"...","commit":"...","judge":"technical|design|impact","scores":{"technology":0,"design":0,"impact":0,"innovation":0,"presentation":0},"total":0,"readiness":"...","confidence":"high|medium|low"}.

Be candid and specific. Avoid generic praise, unsupported competitor assertions, and invented user validation. Recommendations should tell the builder exactly what to change or demonstrate and why it affects the score.
