# Independent mock panel — Harambee, October 7, 2026

This is a simulated hackathon assessment, not an official score or prize prediction. Source: commit `4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b`. Inspect only the assigned snapshot and your own output directory. Prior judging and remediation are withheld. Do not read the original repo, other projects, previous scores or other judges' reports.

## Criteria and scoring
The [official rules](https://paypalaihackathon.devpost.com/rules), checked October 7, specify five equally weighted criteria: technological implementation, design, potential impact, innovation/idea, and presentation. Stage One screens basic viability and reasonable use of the required APIs/SDKs. The submission must include a working demo and setup instructions, a public GitHub repo, open-source license, and public YouTube video under three minutes; hosting is optional.

Our numerical calibration is 0–10 per criterion, half points allowed. Total = 2 × sum, out of 100. 0–2 missing/broken; 3–4 significant gaps; 5–6 credible prototype with material limits; 7–8 strong and convincingly demonstrated; 9–10 exceptional execution and evidence. Score all five independently. Do not target a particular score or demand enterprise maturity for a hackathon.

Technology: depth/correctness of PayPal and AI implementation. Design: complete, coherent, usable experience. Impact: credible problem, specific audience and demonstrated benefit. Innovation: defensible differentiation, not unsupported novelty. Presentation: actual pitch/video and evidence explaining a working end-to-end journey. Separate submission completeness from product quality.

## Evidence and boundaries
No source edits, git mutations, secrets, external posting or live PayPal/model calls. Scratch repros may use /private/tmp and your output folder. Tests use fixtures; they do not prove provider behavior. Submitted sandbox/model records can support evidence if internally consistent; distinguish recorded evidence from your own verification. Small synthetic evaluations do not establish user benefit. Review the local video's actual content and currency, if present, without assuming it represents latest code or continuous provider execution. Any market claims require sources or must be framed as hypotheses.

Technical judge: run tests/evals, inspect financial consent/recovery/privacy and AI grounding, reproduce important defects where feasible using isolated state. Design judge: operate the isolated UI at http://127.0.0.1:3701, test main journey and 375px layout, review accessibility and understanding. Use UI/UX skill and available native browser control. Only design may mutate this shared UI state; other judges must use separate temporary state. Impact judge: inspect source and presentation artifacts, challenge AI value against baseline, adoption/incentives, evidence and differentiation.

## Deliverables
In your assigned output folder write report.md and scores.json. Report source/role/method, limitations, scores and a paragraph of rationale per criterion, strengths, prioritized actionable findings (P0 core flow broken, P1 major weakness, P2 polish/evidence), verified repo-relative path:line references and repro steps. Mark observed/source-inferred/unverified. Do not invent a P0 or force a finding count. Include stage-one readiness (demonstrated/conditional/insufficient evidence), submission gaps, three judge questions, and smallest credible next step.
JSON: {"project":"harambee","commit":"4ed2d00ce46a0bc85a2262bd2fe067c8e10fb89b","judge":"technical|design|impact","scores":{"technology":0,"design":0,"impact":0,"innovation":0,"presentation":0},"total":0,"readiness":"...","confidence":"high|medium|low"}.
