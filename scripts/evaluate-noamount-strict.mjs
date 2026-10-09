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

// From the briefs' notes: "not a Why on any option that raises Alex's share". With Sam gone,
// every option raises everyone's share ($600 or $480 split three ways vs $150 before), so the
// refusal may never be a Why at all.
const NEVER_WHY = { "na-no-more": ["alex"] };

const cases = JSON.parse(
  readFileSync(
    new URL("../eval/revision-cases-noamount.json", import.meta.url),
    "utf8",
  ),
);
const rescore = process.argv.indexOf("--rescore");
let source;
if (rescore > 0) {
  source = JSON.parse(readFileSync(process.argv[rescore + 1], "utf8"));
} else {
  // Run the briefs the same way the original scorer does, then score strictly.
  const { execFileSync } = await import("node:child_process");
  const args = [
    new URL("./evaluate-noamount.mjs", import.meta.url).pathname,
    ...(process.argv.includes("--live") ? ["--live"] : []),
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
  const who = (q) => q.split(":")[1]?.trim();
  const modelQuestions = r.questions.filter((q) => !q.startsWith("code:"));
  const checks = {
    ...r.checks,
    ...(NEVER_WHY[r.id]
      ? {
          refusalNeverAWhy: NEVER_WHY[r.id].every((id) =>
            r.options.every((o) => !o.why.some((w) => w.startsWith(`${id}:`))),
          ),
        }
      : {}),
  };
  return {
    id: r.id,
    pass: Object.values(checks).every(Boolean),
    checks,
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
const report = {
  cases: "revision-cases-noamount",
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
    note: "Model questions in briefs that name who to ask; code-raised questions excluded.",
  },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(
      `../eval/revision-noamount-strict-${rescore > 0 ? "rescore" : source.mode === "live-model" ? "live" : "local"}.json`,
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
