import test from "node:test";
import assert from "node:assert/strict";
import {
  openAIProposalSource,
  referenceProposalSource,
} from "../server/proposal-source.mjs";
const request = {
  instructions: "Extract a draft",
  input: "Maya: $220 maximum",
  name: "group_preferences",
  schema: { type: "object" },
  maxOutputTokens: 1600,
  timeoutMs: 12000,
};
const envelope = (text = '{"constraints":[]}') => ({
  status: "completed",
  model: "model-returned",
  usage: { total_tokens: 123 },
  output: [{ content: [{ type: "output_text", text }] }],
});
test("provider adapter sends strict non-stored requests without payment tools and returns provenance", async () => {
  let calls = 0;
  const source = openAIProposalSource({
    apiKey: "synthetic-key",
    model: "requested-model",
    fetch: async (url, init) => {
      calls++;
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(init.method, "POST");
      assert.equal(init.headers.Authorization, "Bearer synthetic-key");
      assert.ok(init.signal instanceof AbortSignal);
      const body = JSON.parse(init.body);
      assert.equal(body.model, "requested-model");
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.max_output_tokens, 1600);
      assert.deepEqual(body.text.format, {
        type: "json_schema",
        name: request.name,
        strict: true,
        schema: request.schema,
      });
      assert.equal(body.input, request.input);
      return { ok: true, json: async () => envelope() };
    },
  });
  const out = await source(request);
  assert.equal(calls, 1);
  assert.deepEqual(out.value, { constraints: [] });
  assert.equal(out.provider, "openai");
  assert.equal(out.model, "model-returned");
  assert.equal(out.usage.total_tokens, 123);
  assert.ok(out.latencyMs >= 0);
});
test("provider adapter rejects failed, incomplete, missing and malformed structured responses", async () => {
  for (const response of [
    { ok: false },
    { ok: true, json: async () => ({ ...envelope(), status: "incomplete" }) },
    { ok: true, json: async () => ({ status: "completed", output: [] }) },
    ...["not JSON", "null", "[]"].map((text) => ({
      ok: true,
      json: async () => envelope(text),
    })),
  ]) {
    const source = openAIProposalSource({
      apiKey: "synthetic-key",
      fetch: async () => response,
    });
    await assert.rejects(source(request));
  }
  const source = openAIProposalSource({
    apiKey: "synthetic-key",
    fetch: async () => {
      throw Error("timeout");
    },
  });
  await assert.rejects(source(request), /timeout/);
});
test("no key selects local behavior and reference evidence is isolated across verification runs", async () => {
  assert.equal(openAIProposalSource({ apiKey: "" }), null);
  const value = { constraints: [{ person: "Maya" }], provider: "openai" };
  const source = referenceProposalSource(value);
  value.constraints[0].person = "Sam";
  const first = await source();
  first.value.constraints[0].person = "Jordan";
  const second = await source();
  assert.equal(second.value.constraints[0].person, "Maya");
  assert.equal(second.provider, "reference");
  assert.equal(second.model, null);
});
