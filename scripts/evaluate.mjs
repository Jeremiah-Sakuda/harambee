import { referenceProposalSource } from "../server/proposal-source.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { interpret } from "../server/ai.mjs";
const cases = JSON.parse(
  readFileSync(new URL("../eval/cases.json", import.meta.url), "utf8"),
);
const live = process.argv.includes("--live");
if (live && !process.env.OPENAI_API_KEY)
  throw Error(
    "A configured OPENAI_API_KEY is required for --live. No live run occurred.",
  );
const results = [];
for (const c of cases.filter((c) => !live || !("modelAmount" in c))) {
  const source = live
    ? undefined
    : "modelAmount" in c
      ? referenceProposalSource({
          constraints: [
            {
              source: c.input,
              line: 1,
              person: c.modelPerson,
              budgetCents: c.modelAmount,
              needsReview: false,
              preference: "Fixture interpretation",
            },
          ],
        })
      : null;
  const output = await interpret(c.input, { source });
  const observed = output.constraints[0];
  const pass = ["person", "budgetCents", "needsReview"].every(
    (k) => observed[k] === c[k],
  );
  results.push({
    id: c.id,
    pass,
    provider: output.provider,
    observed,
    model: output.model,
    latencyMs: output.latencyMs,
  });
}
const report = {
  fixtureVersion: 1,
  mode: live ? "live-provider" : "offline-parser-and-injected-validator",
  liveProviderRequested: live,
  liveProviderExecuted: live && results.some((r) => r.provider === "openai"),
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  limitations:
    "Synthetic labeled parser cases and injected model-output validation; provider accuracy and participant effort are separate benchmarks.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(`../eval/results${live ? "-live" : ""}.json`, import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
if (report.passed !== report.total) process.exitCode = 1;
