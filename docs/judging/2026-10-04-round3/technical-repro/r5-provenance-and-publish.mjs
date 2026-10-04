// (a) Publish invariant: shares always equal allocate(saved budgets); an unconfirmed stated cap cannot be published.
// (b) Provenance shown in audit ("suggested by <model>, verified by code") is whatever the client sends.
import { Engine, memory, proposeRevisions, tryIt } from "./harness.mjs";
const e = new Engine(memory());
for (const p of e.active) e.approve(p.id, 1);
e.withdraw("organizer", "sam");
const notes = "Maya: I can't go above $170 now";
const out = await proposeRevisions(e, { notes, recheck: [{ title: "Maya cap", listingId: "pine", capRequests: [{ participantId: "maya", amountCents: 17000, line: 1, quote: "can't go above $170" }], explanation: "", tradeoff: "", source: "openai" }] });
const capped = out.options.find((o) => o.confirmations.length);
console.log("capped option ready?", capped.ready, "rows:", capped.rows.map((r) => r.share));
await tryIt("publish capped option before Maya confirms", () => e.revise("organizer", { listingId: "pine", expectedShares: capped.rows.map((r) => ({ id: r.participantId, share: r.share })) }));
await tryIt("publish with forged shares under Maya's budget", () => e.revise("organizer", { expectedShares: [{ id: "maya", share: 22000 }, { id: "jordan", share: 19000 }, { id: "alex", share: 19000 }] }));
await tryIt("publish with forged provenance, no option ever generated", () => e.revise("organizer", { proposal: { title: "GPT-5 optimal fairness plan", source: "openai", model: "gpt-5-pro" } }));
console.log("audit:", e.state.audit.at(-1).text);
console.log("version shares vs budgets:", e.current.shares.map((s) => `${s.id}:${s.share}/${e.state.participants.find((p) => p.id === s.id).budget}`).join(" "));
