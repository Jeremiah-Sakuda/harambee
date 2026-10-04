# Round-two mock judging protocol — Harambee

Simulated judge assessment, not an official decision or prize prediction.

## Subject
- Frozen snapshot: `SNAP=/private/tmp/claude-501/-Users-jerem-2026-Hackathon-Ideation-Paypal-Hackathon-harambee/4bae3954-33bb-4909-b478-ba017b7706f5/scratchpad/panel/harambee`
- Source: commit `b2cacab755b3a3eee41fa8adb31570bbc93a97fe` **plus uncommitted working-tree changes** (closed-trip review dialog guard in `src/main.jsx`, `.gitignore`, `docs/ROUND2_QA.md`, `docs/demo/`). Treat this snapshot as "the submission as it exists today."
- `node_modules` is a symlink to the author's installed tree (not a clean install).
- Isolated running production build: http://127.0.0.1:3501 (simulated payments, no OpenAI or PayPal credentials, private state file). Only the design judge should mutate it.
- Demo video: `$SNAP/docs/demo/preview.mp4` (2:26). Frames every 5 s extracted to `.../scratchpad/panel/video-frames/t001.png…t029.png`; captions `docs/demo/captions.vtt`; narration `docs/demo/TRANSCRIPT.md`.

## Official basis
PayPal AI Hackathon official rules (https://paypalaihackathon.devpost.com/rules): five **equally weighted** criteria.
- **Technological Implementation** — How thoroughly and skillfully does the project use PayPal Developer Platform and AI tool(s)? Genuine effort, working, non-trivial?
- **Design** — A complete, coherent product experience, not just a technical proof of concept?
- **Potential Impact** — Credible, specific case for a real problem for a real audience, and does the demonstrated solution address it?
- **Innovation/Idea** — How creative and novel; does it differ from existing concepts?
- **Presentation** — Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate problem, audience, why it matters? Easy to follow?
Stage One screens baseline viability, theme fit and reasonable use of required APIs/SDKs. Submission requires a functional demo w/ setup instructions (hosting optional), public GitHub repo, open-source license, and a public YouTube video under 3 minutes. Judges may rely solely on submission materials.

## Scale (our calibration)
0–10 per criterion, half points allowed. Total = 2 × sum, out of 100.
0–2 missing/broken · 3–4 significant gaps · 5–6 credible prototype with material limitations · 7–8 strong, convincingly demonstrated · 9–10 exceptional with unusually persuasive evidence.

Calibrate against a competitive hackathon field: winning projects typically show live sandbox payments and visible AI doing real work in the video. A provider adapter tested only with mocks is "implemented, not verified." Passing unit tests do not prove live integration. Synthetic/simulated demos must stay labeled. Honest labeling is a virtue but does not substitute for demonstrated function.

## Independence
- The repo contains a prior mock panel (`docs/judging/2026-10-03/`) and remediation notes. Real judges could see these, so you may read them, but **form and record your scores before reading the prior panel's scores**, and do not anchor on them. Say in your report whether you read them.
- Do not read other round-two judges' output directories.
- No source edits in the snapshot. Scratch scripts/state only under your own output directory or /private/tmp. No live PayPal/model calls, no secrets, no external posting, no git mutations.

## Deliverables (in your assigned output dir)
1. `report.md`: persona, scope/method, commands/flows verified, limitations; five-criterion score table with total/100 and ≥1 paragraph of rationale per criterion; strengths to preserve; ≥5 prioritized improvements (P0 core demo broken / P1 major judging weakness / P2 polish) — do not invent a P0; evidence references as repo-relative `path:line` (verified); repro steps for defects; mark each claim observed / source-inferred / unverified; Stage-One readiness (demonstrated / conditional / insufficient); top 3 questions you'd ask the team; the single highest-leverage next step.
2. `scores.json`: {"project":"harambee","source":"b2cacab+worktree","judge":"<persona>","scores":{"technology":0,"design":0,"impact":0,"innovation":0,"presentation":0},"total":0,"readiness":"...","confidence":"high|medium|low"}
3. Final message back to the moderator: scores, total, top 3 findings (≤200 words).

Be candid and specific. No generic praise, no unsupported competitor claims, no invented user validation.
