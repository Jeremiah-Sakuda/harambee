// No-AI baseline: runs every revision brief through the local planner (no model) with the same
// verifier and backstop the model's options go through. No network: fetch is stubbed to throw.
// Usage: node scripts/local-planner-baseline.mjs > eval/local-planner-baseline.txt
import { readFileSync } from "node:fs";
const SNAP = decodeURIComponent(
  new URL("..", import.meta.url).pathname,
).replace(/\/$/, "");
const { Engine, allocate, seed } = await import(SNAP + "/server/domain.mjs");
const { proposeRevisions } = await import(
  SNAP + "/server/revision-options.mjs"
);
delete process.env.OPENAI_API_KEY;
globalThis.fetch = async () => {
  throw new Error("network disabled");
};
const memory = () => {
  let d;
  return {
    load: () => structuredClone(d),
    save: (s) => {
      d = structuredClone(s);
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
for (const set of [
  "revision-cases",
  "revision-cases-holdout",
  "revision-cases-holdout2",
]) {
  const cases = JSON.parse(
    readFileSync(SNAP + "/eval/" + set + ".json", "utf8"),
  );
  let pass = 0,
    safeN = 0;
  const rows = [];
  for (const c of cases) {
    const e = engineFor(c);
    const out = await proposeRevisions(e, { notes: c.chat.join("\n") });
    const budgets = Object.fromEntries(e.active.map((p) => [p.id, p.budget]));
    const feasible = out.options.filter((o) => o.feasible);
    const capsOf = (o) =>
      Object.fromEntries(
        o.confirmations.map((x) => [x.participantId, x.amountCents]),
      );
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
    if (safe && useful) pass++;
    if (safe) safeN++;
    rows.push(
      `  ${c.id.padEnd(34)} ${c.kind.padEnd(11)} safe=${safe} useful=${useful} provider=${out.provider} caps=${JSON.stringify(out.options.map(capsOf))} clar=${out.clarifications.length}`,
    );
  }
  console.log(
    `${set}: local planner pass ${pass}/${cases.length}, safe ${safeN}/${cases.length}`,
  );
  console.log(rows.join("\n"));
}
