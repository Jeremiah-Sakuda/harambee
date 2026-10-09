// Measures what the model adds over the no-AI planner on briefs whose deciding message has no
// dollar amount: does the right person get a question, do people's words back the option they
// support, and is an objection never shown as a reason for the option it objects to?
// The briefs (eval/revision-cases-noamount.json) were committed before either run.
// Usage: node scripts/evaluate-noamount.mjs [--live] [--write]
//   default: the local planner (no model); --live: the configured model (needs OPENAI_API_KEY).
import { readFileSync, writeFileSync } from "node:fs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";
import { Engine } from "../server/domain.mjs";
import { proposeRevisions } from "../server/revision-options.mjs";

const live = process.argv.includes("--live");
if (live && !process.env.OPENAI_API_KEY)
  throw Error("OPENAI_API_KEY is required for --live. No live run occurred.");
if (!live) {
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async () => {
    throw Error("Network disabled for the local planner run");
  };
}
const cases = JSON.parse(
  readFileSync(
    new URL("../eval/revision-cases-noamount.json", import.meta.url),
    "utf8",
  ),
);
const memory = () => {
  let disk;
  return {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  };
};
const results = [];
for (const c of cases) {
  const e = new Engine(memory());
  for (const p of e.active) e.approve(p.id, 1);
  e.withdraw("organizer", "sam");
  const out = await proposeRevisions(e, { notes: c.chat.join("\n") });
  const whyOn = (listingId, participantId) =>
    out.options.some(
      (o) =>
        o.listingId === listingId &&
        o.basis.some((b) => b.participantId === participantId),
    );
  const checks = {
    // Nobody wrote an amount, so no option may use a limit.
    noInventedLimit: out.options.every((o) => o.confirmations.length === 0),
    ...(c.expect.askWho
      ? {
          asksRightPerson: out.clarifications.some(
            (q) => q.participantId === c.expect.askWho,
          ),
        }
      : {}),
    ...(c.expect.support
      ? {
          wordsBackTheirChoice: c.expect.support.every((s) =>
            whyOn(s.listingId, s.participantId),
          ),
        }
      : {}),
    ...(c.expect.objection
      ? {
          objectionNeverAWhy: c.expect.objection.every(
            (s) => !whyOn(s.listingId, s.participantId),
          ),
        }
      : {}),
  };
  results.push({
    id: c.id,
    pass: Object.values(checks).every(Boolean),
    checks,
    provider: out.provider,
    model: out.model,
    latencyMs: out.latencyMs,
    questions: out.clarifications.map(
      (q) => `${q.source ?? "model"}: ${q.participantId}: ${q.question}`,
    ),
    options: out.options.map((o) => ({
      listingId: o.listingId,
      source: o.source,
      why: o.basis.map((b) => `${b.participantId}: ${b.quote}`),
      notWhy: o.considered.map(
        (b) => `${b.relation}: ${b.participantId}: ${b.quote}`,
      ),
    })),
  });
}
const report = {
  // Which code produced these results: commit, uncommitted changes, file hashes.
  source: sourceFingerprint([
    "server/revision-options.mjs",
    "server/ai.mjs",
    "server/domain.mjs",
  ]),
  cases: "revision-cases-noamount",
  mode: live ? "live-model" : "local-planner",
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  fallbacks: results.filter((r) => live && r.provider !== "openai").length,
  note: "Briefs written and committed before any run. Small synthetic set written by the developer; not user data.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(
      `../eval/revision-noamount-results-${live ? "live" : "local"}.json`,
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
