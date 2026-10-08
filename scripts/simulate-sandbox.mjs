import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { scenarios } from "../test/helpers/sandbox-scenarios.mjs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";

const source = sourceFingerprint();

globalThis.fetch = async () => {
  throw Error("Network disabled in offline sandbox matrix");
};
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
if (
  args.some(
    (a, i) =>
      a !== "--output" &&
      a !== "--strict" &&
      !(outputIndex >= 0 && i === outputIndex + 1),
  ) ||
  (outputIndex >= 0 && !args[outputIndex + 1])
) {
  console.error(
    "Usage: npm run sandbox:simulate -- [--output /path/report.json] [--strict]",
  );
  process.exit(2);
}
const results = [];
for (const s of scenarios) {
  let observation;
  try {
    observation = await s.run();
  } catch (error) {
    results.push({
      id: s.id,
      title: s.title,
      status: "unexpected-failure",
      error: error.message,
    });
    continue;
  }
  try {
    s.verify(observation);
    results.push({
      id: s.id,
      title: s.title,
      status: "passed",
      resolvedLegacyGap: s.knownGap || undefined,
      observation,
    });
  } catch (error) {
    const known = s.knownGap && error.message.includes(s.failureMarker);
    results.push({
      id: s.id,
      title: s.title,
      status: known ? "known-failure" : "unexpected-failure",
      knownGap: s.knownGap,
      error: error.message,
      observation,
    });
  }
}
const counts = Object.fromEntries(
  ["passed", "known-failure", "unexpected-failure"].map((status) => [
    status,
    results.filter((r) => r.status === status).length,
  ]),
);
const report = {
  startedSource: source,
  finishedSource: sourceFingerprint(),
  at: new Date().toISOString(),
  mode: "offline-provider-simulation",
  providerCalls: 0,
  scenarioCount: results.length,
  counts,
  limitations:
    "Synthetic resource transitions exercise application behavior; they do not establish actual PayPal timing, risk decisions, or sandbox feasibility.",
  results,
};
report.sourceStable =
  JSON.stringify(report.startedSource.sha256) ===
  JSON.stringify(report.finishedSource.sha256);
for (const r of results)
  console.log(
    `${r.status.padEnd(18)} ${r.id}${r.error ? ` — ${r.error.split("\n")[0]}` : ""}`,
  );
console.log(
  JSON.stringify({
    scenarioCount: report.scenarioCount,
    counts,
    providerCalls: 0,
  }),
);
if (outputIndex >= 0) {
  const file = resolve(args[outputIndex + 1]);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${file}`);
}
// Known gaps are visible, not counted as passes; strict mode fails on them too.
process.exitCode =
  !report.sourceStable ||
  counts["unexpected-failure"] ||
  (args.includes("--strict") && counts["known-failure"])
    ? 1
    : 0;
