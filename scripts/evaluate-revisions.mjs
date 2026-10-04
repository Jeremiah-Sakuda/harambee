// Frozen evaluation of revision options (PRD: 12 briefs — clear, ambiguous, infeasible/adversarial).
// Offline mode feeds hand-written reference answers through the real verifier; it measures the
// verifier, not a model. --live calls the configured model and records its actual results.
import { readFileSync, writeFileSync } from "node:fs";
import { Engine, allocate, seed } from "../server/domain.mjs";
import { proposeRevisions } from "../server/revision-options.mjs";

// --holdout uses briefs written after the first live run and before any tuning on it.
const holdout = process.argv.includes("--holdout");
const set = holdout ? "revision-cases-holdout" : "revision-cases";
const cases = JSON.parse(
  readFileSync(new URL(`../eval/${set}.json`, import.meta.url), "utf8"),
);
const live = process.argv.includes("--live");
if (live && !process.env.OPENAI_API_KEY)
  throw Error(
    "A configured OPENAI_API_KEY is required for --live. No live run occurred.",
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
function engineFor(c) {
  const state = seed();
  const names = c.roster ?? state.participants.map((p) => p.name);
  state.participants = names.map((name) => ({
    id: name.split(" ")[0].toLowerCase(),
    name,
    initials: name.slice(0, 2).toUpperCase(),
    budget: c.budgets?.[name.split(" ")[0].toLowerCase()] ?? 22000,
    active: true,
  }));
  state.versions[0].shares = allocate(60000, state.participants);
  const store = memory();
  store.save(state);
  const e = new Engine(store);
  for (const p of e.active) e.approve(p.id, 1);
  e.withdraw("organizer", "sam");
  return e;
}
const originalFetch = globalThis.fetch,
  key = process.env.OPENAI_API_KEY;
const results = [];
try {
  for (const c of cases) {
    const e = engineFor(c);
    if (!live) {
      process.env.OPENAI_API_KEY = "offline-fixture";
      globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({
          status: "completed",
          model: "reference-fixture",
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    summary: "",
                    options: c.reference.map((r) => ({
                      title: `Reference ${r.listingId}`,
                      explanation: "Reference answer.",
                      tradeoff: "",
                      ...r,
                    })),
                    clarifications: c.referenceClarifications ?? [],
                  }),
                },
              ],
            },
          ],
        }),
      });
    }
    const out = await proposeRevisions(e, { notes: c.chat.join("\n") });
    const budgets = Object.fromEntries(e.active.map((p) => [p.id, p.budget]));
    const feasible = out.options.filter((o) => o.feasible);
    const capsOf = (o) =>
      Object.fromEntries(
        o.confirmations.map((c) => [c.participantId, c.amountCents]),
      );
    // Safety: nothing publishable exceeds a saved budget; forbidden caps/cabins never appear.
    const safe =
      out.options
        .filter((o) => o.ready)
        .every((o) =>
          o.rows.every((r) => r.share <= budgets[r.participantId]),
        ) &&
      out.options.every(
        (o) =>
          o.listingId !== c.expect.forbidListing &&
          Object.entries(c.expect.forbidCap ?? {}).every(
            ([id, cents]) => capsOf(o)[id] !== cents,
          ),
      );
    const matches = (o) =>
      (!c.expect.listing || o.listingId === c.expect.listing) &&
      Object.entries(c.expect.cap ?? {}).every(
        ([id, cents]) => capsOf(o)[id] === cents,
      );
    const useful = c.expect.clarify
      ? out.clarifications.length > 0
      : feasible.some(matches);
    results.push({
      id: c.id,
      kind: c.kind,
      pass: safe && useful,
      safe,
      useful,
      // Offline answers are hand-written references routed through the model path, not model output.
      provider: live || out.provider !== "openai" ? out.provider : "reference",
      model: live ? out.model : null,
      latencyMs: out.latencyMs,
      options: out.options.map((o) => ({
        listingId: o.listingId,
        feasible: o.feasible,
        caps: capsOf(o),
        shares: o.rows.map((r) => r.share),
        source: live || o.source !== "openai" ? o.source : "reference",
        removedLimits: o.removedLimits,
      })),
      clarifications: out.clarifications.length,
      discarded: out.discarded,
      fallbackReason: out.fallbackReason,
    });
  }
} finally {
  globalThis.fetch = originalFetch;
  if (key) process.env.OPENAI_API_KEY = key;
  else delete process.env.OPENAI_API_KEY;
}
const report = {
  fixtureVersion: 1,
  cases: set,
  mode: live ? "live-provider" : "offline-reference-answers-through-verifier",
  liveProviderExecuted: live && results.some((r) => r.provider === "openai"),
  passed: results.filter((r) => r.pass).length,
  safe: results.filter((r) => r.safe).length,
  total: results.length,
  acceptance:
    "PRD target: at least 10 of 12 useful proposals or correct clarification requests; zero publishable options that exceed a saved budget.",
  limitations: live
    ? "Synthetic briefs; one run of one model. Not user research."
    : "Reference answers are hand-written, two deliberately unsafe; this measures the verifier and planner pipeline, not model accuracy.",
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL(
      `../eval/revision${holdout ? "-holdout" : ""}-results${live ? "-live" : ""}${process.env.EVAL_SUFFIX ? `-${process.env.EVAL_SUFFIX}` : ""}.json`,
      import.meta.url,
    ),
    JSON.stringify(report, null, 2) + "\n",
  );
if (report.safe !== report.total || (!live && report.passed !== report.total))
  process.exitCode = 1;
