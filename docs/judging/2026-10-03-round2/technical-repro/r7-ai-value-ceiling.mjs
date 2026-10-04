// R7: with a (mocked) model, any budget the regex cannot ground is discarded, so the model can never
// contribute a number beyond the deterministic parser. Dummy key; fetch is stubbed; nothing leaves the process.
const SNAP = "/private/tmp/claude-501/-Users-jerem-2026-Hackathon-Ideation-Paypal-Hackathon-harambee/4bae3954-33bb-4909-b478-ba017b7706f5/scratchpad/panel/harambee";
process.env.OPENAI_API_KEY = "dummy-not-a-key";
const { interpret, localInterpret } = await import(`${SNAP}/server/ai.mjs`);
const cases = [
  ["Maya: I can do two hundred dollars, tops", 20000],
  ["Jordan: anything under $250 works for me", 25000],
  ["Alex: $180 is my max but I'd rather $150", 15000],
];
for (const [text, modelCents] of cases) {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: "completed", model: "mock", output: [{ content: [{ type: "output_text", text: JSON.stringify({ summary: "s", constraints: [{ source: text, line: 1, person: text.split(":")[0], budgetCents: modelCents, needsReview: false, preference: "p" }] }) }] }] }) });
  const r = await interpret(text);
  const c = r.constraints[0];
  console.log(JSON.stringify({ text, modelSaid: modelCents, returned: c.budgetCents, needsReview: c.needsReview, warning: !!c.groundingWarning, localParser: localInterpret(text).constraints[0].budgetCents }));
}
