// Model prose: figures without "$"/"dollars"/"USD" escape the prose check; any figure that equals
// SOME allowed number (e.g. the old share) passes in any role; non-numeric false claims
// ("Maya and Jordan already agreed") flow into the published version's provenance + audit.
import { domain, rev, memory, withModel } from "./harness.mjs";
const fresh = () => { const e = new domain.Engine(memory()); for (const p of e.active) e.approve(p.id, 1); e.withdraw("organizer", "sam"); return e; };
const variants = [
  "Everyone pays 140 each, cheaper than before.",
  "Each of you chips in a hundred and forty.",
  "Each of you pays 140$.",
  "Each of you pays one-forty.",
  "Each of you pays ＄140.",
  "Each of you still pays $150, same as before.",   // 150 = previous share, so allowed
  "Each of you pays $140.",                          // control: should be replaced
  "Each of you pays 140 USD.",                       // control: should be replaced
];
for (const v of variants) {
  const e = fresh();
  const o = await withModel(() => rev.proposeRevisions(e, { notes: "Alex: ok" }), { summary: "", clarifications: [], options: [{ title: "T", listingId: "pine", capRequests: [], explanation: v, tradeoff: "" }] });
  const opt = o.options.find(x => x.source === "openai");
  console.log(JSON.stringify(v).padEnd(52), "explanationReplaced=", opt.explanationReplaced, " actual share=$" + opt.rows[0].share / 100);
}
const e = fresh();
const out = await withModel(() => rev.proposeRevisions(e, { notes: "Alex: I'd rather keep the cabin" }), {
  summary: "", clarifications: [],
  options: [{ title: "Maya and Jordan already agreed to cover Sam", listingId: "pine", capRequests: [], explanation: "Everyone confirmed this in the chat; no need to re-check.", tradeoff: "" }],
});
const first = out.options.find(o => o.source === "openai");
console.log("title shown:", first.title, "| ready:", first.ready);
e.revise("organizer", rev.resolveOption(e, first.id));
console.log("version provenance:", JSON.stringify(e.current.proposal));
console.log("audit:", e.state.audit.at(-1).text);
