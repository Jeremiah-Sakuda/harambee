// Measures what the model adds over the no-AI planner on briefs whose deciding message has no
// dollar amount: does the right person get a question, do people's words back the option they
// support, and is an objection never shown as a reason for the option it objects to?
// The briefs (eval/revision-cases-noamount.json) were committed before either run.
// Usage: node scripts/evaluate-noamount.mjs [--live] [--write]
//   default: the local planner (no model); --live: the configured model (needs OPENAI_API_KEY).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";
import { Engine } from "../server/domain.mjs";
import { openAIProposalSource } from "../server/proposal-source.mjs";
import { proposeRevisions } from "../server/revision-options.mjs";

const live = process.argv.includes("--live");
if (live && !process.env.OPENAI_API_KEY)
  throw Error("OPENAI_API_KEY is required for --live. No live run occurred.");
const casesFlag = process.argv.indexOf("--cases");
const casesPath =
  casesFlag > 0
    ? process.argv[casesFlag + 1]
    : new URL("../eval/revision-cases-noamount.json", import.meta.url);
const cases = JSON.parse(readFileSync(casesPath, "utf8"));
const memory = () => {
  let disk;
  return {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  };
};
const startedAt = new Date().toISOString();
const results = [];
for (const c of cases) {
  const e = new Engine(memory());
  for (const p of e.active) e.approve(p.id, 1);
  e.withdraw("organizer", "sam");
  const provider = live ? openAIProposalSource() : null;
  let acquisition = null;
  const started = Date.now();
  const out = await proposeRevisions(e, {
    notes: c.chat.join("\n"),
    source: provider
      ? async (request) => {
          acquisition = { request, response: null, outcome: "started" };
          try {
            const response = await provider(request);
            acquisition.response = structuredClone(response);
            acquisition.outcome = "completed";
            return response;
          } catch (error) {
            acquisition.outcome = "failed";
            acquisition.error = error.name;
            throw error;
          }
        }
      : null,
  });
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
    acquisition,
    verifiedOutput: out,
    elapsedMs: Date.now() - started,
    usage: out.usage ?? null,
    fallbackReason: out.fallbackReason ?? null,
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
  startedAt,
  completedAt: new Date().toISOString(),
  requestedModel: live ? process.env.OPENAI_MODEL || "gpt-4.1-mini" : null,
  acquisitionFormat: 1,
  // Which code produced these results: commit, uncommitted changes, file hashes.
  source: sourceFingerprint([
    "server/revision-options.mjs",
    "server/ai.mjs",
    "server/proposal-source.mjs",
    "server/domain.mjs",
  ]),
  cases:
    casesFlag > 0 ? process.argv[casesFlag + 1] : "revision-cases-noamount",
  casesSha256: createHash("sha256")
    .update(readFileSync(casesPath))
    .digest("hex"),
  mode: live ? "live-model" : "local-planner",
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  fallbacks: results.filter((r) => live && r.provider !== "openai").length,
  note: "Synthetic fixture comparison. Corpus authorship and freeze history are documented alongside the case file. Full acquisition and verified outputs are retained per case.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(
      `../eval/revision-noamount-results-${live ? "live" : "local"}-${startedAt.replaceAll(":", "-")}.json`,
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
