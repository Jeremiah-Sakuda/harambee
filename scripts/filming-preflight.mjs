// Run on filming day: preserve three live sample-chat outputs and their common narration facts.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.some((a) => a !== "--dry-run"))
  throw Error("Usage: npm run filming:preflight -- [--dry-run]");
const childArgs = [
  "--env-file-if-exists=.env",
  "scripts/demo-chat-live.mjs",
  "3",
];
if (args.includes("--dry-run")) {
  console.log(
    "No model call made. On filming day this runs the sample chat exactly three times, saves dated private evidence, and writes a narration check.",
  );
  console.log(`${process.execPath} ${childArgs.join(" ")}`);
  process.exit(0);
}
const at = new Date().toISOString();
const dir = resolve(root, "submission", "filming", at.replaceAll(":", "-"));
mkdirSync(dir, { recursive: true, mode: 0o700 });
const fingerprint = () => ({
  ...sourceFingerprint(),
  filmingFiles: Object.fromEntries(
    [
      "src/main.jsx",
      "server/revision-options.mjs",
      "server/ai.mjs",
      "scripts/demo-chat-live.mjs",
    ].map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(join(root, file)))
        .digest("hex"),
    ]),
  ),
});
const startedSource = fingerprint();
const raw = execFileSync(process.execPath, childArgs, {
  cwd: root,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 4 * 1024 * 1024,
});
const live = JSON.parse(raw);
// Preserve every result, including model failures and fallback; never cherry-pick for narration.
writeFileSync(
  join(dir, "demo-chat-live.json"),
  JSON.stringify(live, null, 2) + "\n",
  { mode: 0o600 },
);
const finishedSource = fingerprint();
const sourceStable =
  JSON.stringify(startedSource.sha256) ===
    JSON.stringify(finishedSource.sha256) &&
  JSON.stringify(startedSource.filmingFiles) ===
    JSON.stringify(finishedSource.filmingFiles);
const allLive =
  live.results.length === 3 &&
  live.results.every((r) => r.provider === "openai" && r.model);
const common = (arrays) =>
  [...new Set(arrays[0] || [])].filter((value) =>
    arrays.every((list) => list.includes(value)),
  );
const signature = (option) =>
  `${option.listingId}: ${option.shares.join(" / ")}`;
const commonOptions = common(live.results.map((r) => r.options.map(signature)));
const commonQuotes = Object.fromEntries(
  commonOptions.map((key) => [
    key,
    common(
      live.results.map((r) =>
        r.options.filter((o) => signature(o) === key).flatMap((o) => o.why),
      ),
    ),
  ]),
);
const report = {
  at,
  timeZone: "America/New_York",
  purpose: "Filming-day rehearsal, not the recorded take",
  startedSource,
  finishedSource,
  sourceStable,
  allLive,
  models: [...new Set(live.results.map((r) => r.model))],
  latencyMs: live.results.map((r) => r.latencyMs),
  commonConfirmations: common(live.results.map((r) => r.needsConfirming)),
  commonOptions,
  commonQuotes,
  questionsByRun: live.results.map((r) => ({
    run: r.run,
    questions: r.questions,
  })),
};
writeFileSync(
  join(dir, "narration-check.json"),
  JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 },
);
const lines = [
  "# Filming-day narration check",
  "",
  `Run at ${at} (UTC). Local filming timezone: America/New_York.`,
  "",
  allLive && sourceStable
    ? "All three runs used the live model and the source stayed stable. Compare the actual recorded take with these facts before recording narration."
    : "Do not use the live AI narration yet: a provider fallback, missing run, or source change occurred. Inspect all three outputs and rerun after resolving it.",
  "",
  "Facts present in all three runs:",
  "",
  ...report.commonConfirmations.map((v) => `- Confirmation: ${v}`),
  ...commonOptions.map((v) => `- Option shares (USD): ${v}`),
  "",
  "Reasons present on the same option in all three runs:",
  "",
  ...Object.entries(commonQuotes).flatMap(([option, quotes]) =>
    quotes.map((q) => `- ${option} — ${q}`),
  ),
  "",
  "Question wording varies. Read questionsByRun in narration-check.json; describe only what the recorded take shows. Never narrate an invented rejection or a model reason missing from that take.",
  "",
  "This command ran a rehearsal, not a screen recording. Keep the separate PayPal group-refund evidence labeled as a separate prepared trip.",
];
writeFileSync(join(dir, "NARRATION_CHECK.md"), lines.join("\n") + "\n", {
  mode: 0o600,
});
console.log(`Saved all three runs and narration check: ${dir}`);
console.log(
  JSON.stringify(
    {
      allLive,
      sourceStable,
      commonConfirmations: report.commonConfirmations,
      commonOptions,
    },
    null,
    2,
  ),
);
process.exitCode = allLive && sourceStable ? 0 : 1;
