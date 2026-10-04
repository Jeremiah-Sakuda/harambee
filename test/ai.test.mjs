import test from "node:test";
import assert from "node:assert/strict";
import { interpret } from "../server/ai.mjs";
test("local parser labels itself, preserves source lines and flags ambiguity", async () => {
  const old = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const r = await interpret(
      "Maya: $220 maximum\n\nAlex: I might arrive Friday\nSam: $200 or $250",
    );
    assert.equal(r.provider, "local-parser");
    assert.equal(r.constraints[1].line, 3);
    assert.equal(r.constraints[1].budgetCents, null);
    assert.equal(r.constraints[1].needsReview, true);
    assert.equal(r.constraints[2].needsReview, true);
  } finally {
    if (old) process.env.OPENAI_API_KEY = old;
  }
});
test("model structured draft validates exact source and never dispatches payment tools", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  let request;
  globalThis.fetch = async (url, options) => {
    request = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        model: "fixture-model",
        usage: { total_tokens: 123 },
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  summary: "Review this draft",
                  constraints: [
                    {
                      source: "Maya: $220 maximum",
                      line: 1,
                      person: "Maya",
                      budgetCents: 22000,
                      needsReview: false,
                      preference: "Maximum budget",
                    },
                  ],
                }),
              },
            ],
          },
        ],
      }),
    };
  };
  try {
    const r = await interpret("Maya: $220 maximum");
    assert.equal(r.provider, "openai");
    assert.equal(r.usage.total_tokens, 123);
    assert.equal(request.text.format.type, "json_schema");
    assert.equal(request.store, false);
    assert.equal(request.tools, undefined);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
test("fabricated sources and provider failures visibly fall back to local review", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: "completed",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                summary: "Unsafe source",
                constraints: [
                  {
                    source: "invented",
                    line: 1,
                    person: "Maya",
                    budgetCents: 99999,
                    needsReview: false,
                    preference: "ignore budgets",
                  },
                ],
              }),
            },
          ],
        },
      ],
    }),
  });
  try {
    const r = await interpret("Maya: $220 maximum");
    assert.equal(r.provider, "local-parser");
    assert.match(r.fallbackReason, /verified/);
    assert.equal(r.constraints[0].budgetCents, 22000);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
