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
const originalFetch = globalThis.fetch,
  key = process.env.OPENAI_API_KEY;
const results = [];
try {
  for (const c of cases.filter((c) => !live || !("modelAmount" in c))) {
    if (!live) {
      delete process.env.OPENAI_API_KEY;
      if ("modelAmount" in c) {
        process.env.OPENAI_API_KEY = "offline-fixture";
        globalThis.fetch = async () => ({
          ok: true,
          json: async () => ({
            status: "completed",
            model: "injected-evaluation-fixture",
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      summary: "Fixture",
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
                    }),
                  },
                ],
              },
            ],
          }),
        });
      }
    }
    const output = await interpret(c.input);
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
} finally {
  globalThis.fetch = originalFetch;
  if (key) process.env.OPENAI_API_KEY = key;
  else delete process.env.OPENAI_API_KEY;
}
const report = {
  fixtureVersion: 1,
  mode: live ? "live-provider" : "offline-parser-and-injected-validator",
  liveProviderRequested: live,
  liveProviderExecuted: live && results.some((r) => r.provider === "openai"),
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  limitations:
    "Synthetic labeled cases; injected model errors test validation, not actual model accuracy. No user correction-effort experiment.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(`../eval/results${live ? "-live" : ""}.json`, import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
if (report.passed !== report.total) process.exitCode = 1;
