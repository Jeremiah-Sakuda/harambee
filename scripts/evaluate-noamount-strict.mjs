// Stricter scoring of the pre-registered no-amount briefs (eval/revision-cases-noamount.json).
// The original scorer (scripts/evaluate-noamount.mjs) stays as committed. This one adds what the
// briefs' own notes say but their `expect` blocks didn't check, and reports question precision:
// how many of the model's questions go to the person the brief says should be asked.
// Written and committed after a judge found a counted pass that broke its brief's note, and before
// any run with it.
// Usage:
//   node scripts/evaluate-noamount-strict.mjs --rescore eval/revision-noamount-results-live.json
//   node scripts/evaluate-noamount-strict.mjs [--live] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";
import { fileURLToPath } from "node:url";

// From the briefs' notes: "not a Why on any option that raises Alex's share". With Sam gone,
// every option raises everyone's share ($600 or $480 split three ways vs $150 before), so the
// refusal may never be a Why at all.
const NEVER_WHY = { "na-no-more": ["alex"] };

const casesFlag = process.argv.indexOf("--cases");
const casesPath =
  casesFlag > 0
    ? process.argv[casesFlag + 1]
    : new URL("../eval/revision-cases-noamount.json", import.meta.url);
const cases = JSON.parse(readFileSync(casesPath, "utf8"));
const rescore = process.argv.indexOf("--rescore");
let source;
if (rescore > 0) {
  source = JSON.parse(readFileSync(process.argv[rescore + 1], "utf8"));
} else {
  // Run the briefs the same way the original scorer does, then score strictly.
  const { execFileSync } = await import("node:child_process");
  const args = [
    fileURLToPath(new URL("./evaluate-noamount.mjs", import.meta.url)),
    ...(process.argv.includes("--live") ? ["--live"] : []),
    ...(casesFlag > 0 ? ["--cases", process.argv[casesFlag + 1]] : []),
  ];
  source = JSON.parse(
    execFileSync(process.execPath, args, {
      env: process.env,
      maxBuffer: 1 << 26,
    }).toString(),
  );
}
const results = source.results.map((r) => {
  const c = cases.find((c) => c.id === r.id);
  if (!c) throw Error(`Result ${r.id} is not in the supplied corpus`);
  const neverWhy = NEVER_WHY[r.id] ?? c.expect.refusal;
  const who = (q) => q.split(":")[1]?.trim();
  const modelQuestions = r.questions.filter((q) => !q.startsWith("code:"));
  const checks = {
    ...r.checks,
    ...(neverWhy
      ? {
          refusalNeverAWhy: neverWhy.every((id) =>
            r.options.every((o) => !o.why.some((w) => w.startsWith(`${id}:`))),
          ),
        }
      : {}),
  };
  return {
    ...r,
    id: r.id,
    pass: Object.values(checks).every(Boolean),
    checks,
    questionRecall: c.expect.askWho
      ? {
          required: 1,
          modelAnswered: Number(
            modelQuestions.some((q) => who(q) === c.expect.askWho),
          ),
          pipelineAnswered: Number(
            r.questions.some((q) => who(q) === c.expect.askWho),
          ),
        }
      : null,
    // Of the model's questions, how many go to the person the brief says to ask.
    questionPrecision: c.expect.askWho
      ? {
          toRightPerson: modelQuestions.filter(
            (q) => who(q) === c.expect.askWho,
          ).length,
          total: modelQuestions.length,
        }
      : null,
  };
});
const precise = results.filter((r) => r.questionPrecision);
const scoredAt = new Date().toISOString();
const report = {
  scoredAt,
  originalRun: source,
  scorerSource: sourceFingerprint([
    "scripts/evaluate-noamount-strict.mjs",
    "scripts/evaluate-noamount.mjs",
  ]),
  // Which code produced these results: commit, uncommitted changes, file hashes.
  source:
    source.source ??
    (rescore > 0
      ? {
          commit: null,
          testedFilesModified: null,
          sha256: {},
          note: "Original output has no source fingerprint; rescoring does not establish its source identity.",
        }
      : sourceFingerprint([
          "server/revision-options.mjs",
          "server/ai.mjs",
          "server/proposal-source.mjs",
          "server/domain.mjs",
        ])),
  cases: source.cases ?? "revision-cases-noamount",
  casesSha256: source.casesSha256 ?? null,
  scorer: "strict",
  mode: source.mode,
  scored: rescore > 0 ? process.argv[rescore + 1] : "fresh run",
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  questionPrecision: {
    toRightPerson: precise.reduce(
      (n, r) => n + r.questionPrecision.toRightPerson,
      0,
    ),
    total: precise.reduce((n, r) => n + r.questionPrecision.total, 0),
    note: "Recipient precision only; question meaning and usefulness require separate review of the preserved outputs. Code-raised questions excluded.",
  },
  questionRecall: {
    required: results.reduce(
      (n, r) => n + (r.questionRecall?.required ?? 0),
      0,
    ),
    modelAnswered: results.reduce(
      (n, r) => n + (r.questionRecall?.modelAnswered ?? 0),
      0,
    ),
    pipelineAnswered: results.reduce(
      (n, r) => n + (r.questionRecall?.pipelineAnswered ?? 0),
      0,
    ),
    note: "Necessary questions answered, including misses; pipeline includes code-raised questions, model does not.",
  },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(
      `../eval/revision-noamount-strict-${rescore > 0 ? "rescore" : source.mode === "live-model" ? "live" : "local"}-${scoredAt.replaceAll(":", "-")}.json`,
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
