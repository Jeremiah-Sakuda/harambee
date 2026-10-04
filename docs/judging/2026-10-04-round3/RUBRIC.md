# Round-three mock judging protocol — Harambee

Simulated judge assessment, not an official decision or prize prediction.

## Subject
- Frozen snapshot: `SNAP=/private/tmp/claude-501/-Users-jerem-2026-Hackathon-Ideation-Paypal-Hackathon-harambee/4bae3954-33bb-4909-b478-ba017b7706f5/scratchpad/panel3/harambee`
- Source: commit `e3e759395726355c16beb7dc21d4e0fa61c0093d` (branch `paypal-sandbox-live`), exported with `git archive` — committed files only, no `.env`, no runtime data.
- `node_modules` is a symlink to the author's installed tree (not a clean install).
- Isolated running production build: http://127.0.0.1:3601 (simulated payments; **no OpenAI or PayPal credentials**, so the app shows its local planner/parser). Private state file. Only the design judge should mutate it.
- Demo video: `$SNAP/docs/demo/preview.mp4` (2:26, unchanged since an earlier commit). Frames every 5 s: `/private/tmp/claude-501/-Users-jerem-2026-Hackathon-Ideation-Paypal-Hackathon-harambee/4bae3954-33bb-4909-b478-ba017b7706f5/scratchpad/panel/video-frames/t001.png…t029.png`; captions `docs/demo/captions.vtt`; narration `docs/demo/TRANSCRIPT.md`.
- Repository evidence of real provider execution, if any, is under `docs/evidence/`. Judge it as submitted evidence: check internal consistency, but you cannot re-run it.

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
- The repo contains prior mock panels (`docs/judging/`) and remediation notes. Real judges could see these, so you may read them, but **form and record your scores before reading the prior panel's scores**, and do not anchor on them. Say in your report whether you read them.
- Do not read other round-three judges' output directories or any scratchpad outside your own output directory (except the video frames above).
- No source edits in the snapshot. Scratch scripts/state only under your own output directory or /private/tmp. No live PayPal/model calls, no secrets, no external posting, no git mutations.

## Deliverables
Subagents cannot write Markdown reports here, so:
1. Write `scores.json` in your assigned output directory: {"project":"harambee","source":"e3e7593","judge":"<persona>","scores":{"technology":0,"design":0,"impact":0,"innovation":0,"presentation":0},"total":0,"readiness":"demonstrated|conditional|insufficient","confidence":"high|medium|low"}. Scratch scripts/screenshots may also go there.
2. Return your **full report as your final message**: persona, scope/method, commands/flows verified, limitations; five-criterion score table with total/100 and ≥1 paragraph of rationale per criterion; strengths to preserve; ≥5 prioritized improvements (P0 core demo broken / P1 major judging weakness / P2 polish) — do not invent a P0; evidence references as repo-relative `path:line` (verified); repro steps for defects; mark each claim observed / source-inferred / unverified; Stage-One readiness; top 3 questions for the team; the single highest-leverage next step. Start the message with a ≤150-word summary (scores, total, top 3 findings).

Be candid and specific. No generic praise, no unsupported competitor claims, no invented user validation.
