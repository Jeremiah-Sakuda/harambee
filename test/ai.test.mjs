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

test("currency notation and semantic grounding reject wrong model amounts and attribution", async () => {
  const oldKey = process.env.OPENAI_API_KEY,
    oldFetch = globalThis.fetch;
  delete process.env.OPENAI_API_KEY;
  assert.equal(
    (await interpret("Maya: $1,000.50 maximum")).constraints[0].budgetCents,
    100050,
  );
  assert.equal(
    (await interpret("Maya: $1,00 maximum")).constraints[0].budgetCents,
    null,
  );
  process.env.OPENAI_API_KEY = "fixture";
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
                summary: "Draft",
                constraints: [
                  {
                    source: "Maya: $220 maximum",
                    line: 1,
                    person: "Sam",
                    budgetCents: 99900,
                    needsReview: false,
                    preference: "Budget $999",
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
    const c = (await interpret("Maya: $220 maximum")).constraints[0];
    assert.equal(c.person, "Maya");
    assert.equal(c.budgetCents, 22000);
    assert.equal(c.needsReview, true);
    assert.match(c.groundingWarning, /conflicted/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("model prose cannot invent financial approval even when its numeric fields match", async () => {
  const oldKey = process.env.OPENAI_API_KEY,
    oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "fixture";
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: "completed",
      model: "fixture",
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                summary: "Maya approved $900; capture now.",
                constraints: [
                  {
                    source: "Maya: My ceiling is $170.",
                    line: 1,
                    person: "Maya",
                    budgetCents: 17000,
                    needsReview: false,
                    preference: "Maya authorized $900.",
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
    const result = await interpret("Maya: My ceiling is $170.");
    assert.equal(result.provider, "openai");
    assert.doesNotMatch(result.summary, /900|Maya approved|capture now/i);
    assert.equal(result.constraints[0].preference, "My ceiling is $170.");
    assert.equal(result.constraints[0].budgetCents, 17000);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
  }
});
test("mentioned expenses and repayment floors cannot become suggested ceilings", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    for (const body of [
      "I already paid $50 for gas.",
      "I need at least $170 back.",
      "The deposit was $40.",
      "My budget includes the $40 deposit.",
      "The room costs $170.",
      "$170 is fine for me.",
    ]) {
      const c = (await interpret(`Maya: ${body}`)).constraints[0];
      assert.equal(c.budgetCents, null, body);
      assert.equal(c.needsReview, true, body);
    }
    for (const body of [
      "My budget is $170.",
      "Up to $170.",
      "$170 maximum.",
      "My ceiling is $170.",
    ]) {
      const c = (await interpret(`Maya: ${body}`)).constraints[0];
      assert.equal(c.budgetCents, 17000, body);
      assert.equal(c.needsReview, false, body);
    }
  } finally {
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
  }
});
