// Runs the app's own sample chat through the live model several times after Sam drops out, and
// records what a viewer would see: which limits need confirming, which questions are asked, and
// which reasons the model gave. Use it before recording so narration only claims what recurs.
// Usage: node --env-file-if-exists=.env scripts/demo-chat-live.mjs [runs] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { Engine } from "../server/domain.mjs";
import { proposeRevisions } from "../server/revision-options.mjs";

if (!process.env.OPENAI_API_KEY)
  throw Error("OPENAI_API_KEY is required. No live run occurred.");
const runs = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 3);
const src = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const block = src.slice(
  src.indexOf('"Maya: I can spend up to $220'),
  src.indexOf('].join("\\n")'),
);
const notes = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join("\n");
const results = [];
for (let i = 0; i < runs; i++) {
  let disk;
  const e = new Engine({
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  });
  for (const p of e.active) e.approve(p.id, 1);
  e.withdraw("organizer", "sam");
  const out = await proposeRevisions(e, { notes });
  results.push({
    run: i + 1,
    provider: out.provider,
    model: out.model,
    latencyMs: out.latencyMs,
    summary: out.summary,
    needsConfirming: [
      ...new Set(
        out.options.flatMap((o) =>
          o.confirmations
            .filter((c) => c.needed)
            .map((c) => `${c.participantId} ${c.amountCents / 100}`),
        ),
      ),
    ],
    questions: out.clarifications.map(
      (c) => `${c.source ?? "model"}: ${c.participantId}: ${c.question}`,
    ),
    options: out.options.map((o) => ({
      listingId: o.listingId,
      source: o.source,
      matchesRule: !!o.matchesRule,
      shares: o.rows.map((r) => r.share / 100),
      why: o.basis.map((b) => `${b.participantId}: ${b.quote}`),
      // Verified quotes that don't support this option, with how they relate: they point to
      // another option, argue against this one, or were replaced by a later message.
      notWhy: o.considered.map(
        (b) => `${b.relation}: ${b.participantId}: ${b.quote}`,
      ),
      removed: o.removedLimits,
    })),
    discarded: out.discarded,
  });
}
const report = {
  chat: notes.split("\n"),
  runs: results.length,
  note: "Live runs of the sample chat after Sam withdraws. Narrate only what recurs across runs.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL("../eval/demo-chat-live-runs.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
