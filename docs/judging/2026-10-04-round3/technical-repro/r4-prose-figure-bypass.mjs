// The prose-figure check only parses "$<digits>". Figures written as words, "USD 260", "260 dollars" pass unchanged.
import { Engine, memory, proposeRevisions } from "./harness.mjs";
const e = new Engine(memory());
for (const p of e.active) e.approve(p.id, 1);
e.withdraw("organizer", "sam");
const result = { summary: "Jordan will cover two hundred sixty dollars.", clarifications: [{ participantId: "jordan", line: 1, question: "Jordan, can you do 260 dollars?" }], options: [
  { title: "Keep Pine, USD 260 for Jordan", listingId: "pine", capRequests: [], explanation: "Jordan pays two hundred sixty dollars and Maya pays 90 bucks.", tradeoff: "Alex covers USD 250." } ] };
const fetch0 = globalThis.fetch; process.env.OPENAI_API_KEY = "test-key";
globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: "completed", model: "stub-model", output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }] }) });
const out = await proposeRevisions(e, { notes: "Jordan: happy to help\nMaya: tight month" });
globalThis.fetch = fetch0; delete process.env.OPENAI_API_KEY;
const o = out.options.find((x) => x.source === "openai");
console.log({ title: o.title, explanation: o.explanation, tradeoff: o.tradeoff, explanationReplaced: o.explanationReplaced, actualShares: o.rows.map((r) => `${r.name.split(" ")[0]} ${r.share}`) });
console.log("summary:", JSON.stringify(out.summary)); console.log("clarification:", JSON.stringify(out.clarifications[0].question));
