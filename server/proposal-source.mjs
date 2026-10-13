// Acquires untrusted structured proposals. Domain verification stays with the
// notes interpreter and revision planner; neither consumes provider envelopes.
export function openAIProposalSource({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  fetch: fetchResponse = globalThis.fetch,
} = {}) {
  if (!apiKey) return null;
  return async ({
    instructions,
    input,
    schema,
    name,
    maxOutputTokens,
    timeoutMs,
  }) => {
    const start = Date.now();
    const response = await fetchResponse(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          store: false,
          instructions,
          input,
          text: { format: { type: "json_schema", name, strict: true, schema } },
          max_output_tokens: maxOutputTokens,
        }),
      },
    );
    if (!response.ok) throw new Error("Model provider unavailable");
    const raw = await response.json();
    if (raw.status !== "completed")
      throw new Error("Incomplete model response");
    const value = JSON.parse(
      raw.output
        ?.flatMap((o) => o.content ?? [])
        .find((c) => c.type === "output_text")?.text,
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid structured proposal");
    return {
      value,
      provider: "openai",
      model: raw.model,
      latencyMs: Date.now() - start,
      usage: raw.usage ?? null,
    };
  };
}

// Reference evidence crosses the same verification seam as a live proposal,
// but keeps its attribution from acquisition through publication/evaluation.
export function referenceProposalSource(value) {
  const saved = structuredClone(value);
  return async () => ({
    value: structuredClone(saved),
    provider: "reference",
    model: null,
    latencyMs: 0,
    usage: null,
  });
}
