import test from "node:test";
import assert from "node:assert/strict";
import { interpret } from "../server/ai.mjs";
import { referenceProposalSource } from "../server/proposal-source.mjs";

const reference = (constraint, extra = {}) =>
  referenceProposalSource({
    constraints: [constraint],
    ...extra,
  });
const valid = {
  source: "Maya: $220 maximum",
  line: 1,
  person: "Maya",
  budgetCents: 22000,
  needsReview: false,
};
test("local parser labels itself, preserves source lines and flags ambiguity", async () => {
  const r = await interpret(
    "Maya: $220 maximum\n\nAlex: I might arrive Friday\nSam: $200 or $250",
    { source: null },
  );
  assert.equal(r.provider, "local-parser");
  assert.equal(r.constraints[1].line, 3);
  assert.equal(r.constraints[1].budgetCents, null);
  assert.equal(r.constraints[1].needsReview, true);
  assert.equal(r.constraints[2].needsReview, true);
});
test("structured proposals validate exact source while preserving reference attribution", async () => {
  let request;
  const source = async (input) => {
    request = input;
    return reference(valid)();
  };
  const r = await interpret(valid.source, { source });
  assert.equal(r.provider, "reference");
  assert.equal(r.model, null);
  assert.equal(request.name, "group_preferences");
  assert.equal(request.timeoutMs, 12000);
  assert.equal(request.schema.properties.constraints.type, "array");
  assert.equal(r.constraints[0].budgetCents, 22000);
});
test("fabricated sources and proposal failures visibly fall back to local review", async () => {
  for (const source of [
    reference({ ...valid, source: "invented", budgetCents: 99999 }),
    async () => {
      throw Error("provider unavailable");
    },
    referenceProposalSource(null),
  ]) {
    const r = await interpret(valid.source, { source });
    assert.equal(r.provider, "local-parser");
    assert.match(r.fallbackReason, /verified/);
    assert.equal(r.constraints[0].budgetCents, 22000);
  }
});
test("currency notation and semantic grounding reject wrong amounts and attribution", async () => {
  assert.equal(
    (await interpret("Maya: $1,000.50 maximum", { source: null }))
      .constraints[0].budgetCents,
    100050,
  );
  assert.equal(
    (await interpret("Maya: $1,00 maximum", { source: null })).constraints[0]
      .budgetCents,
    null,
  );
  const c = (
    await interpret(valid.source, {
      source: reference({
        ...valid,
        person: "Sam",
        budgetCents: 99900,
        preference: "Budget $999",
      }),
    })
  ).constraints[0];
  assert.equal(c.person, "Maya");
  assert.equal(c.budgetCents, 22000);
  assert.equal(c.needsReview, true);
  assert.match(c.groundingWarning, /conflicted/);
});
test("proposal prose cannot invent financial approval even when numeric fields match", async () => {
  const result = await interpret("Maya: My ceiling is $170.", {
    source: reference(
      {
        ...valid,
        source: "Maya: My ceiling is $170.",
        budgetCents: 17000,
        preference: "Maya authorized $900.",
      },
      {
        summary: "Maya approved $900; capture now.",
      },
    ),
  });
  assert.equal(result.provider, "reference");
  assert.doesNotMatch(result.summary, /900|Maya approved|capture now/i);
  assert.equal(result.constraints[0].preference, "My ceiling is $170.");
  assert.equal(result.constraints[0].budgetCents, 17000);
});
test("mentioned expenses and repayment floors cannot become suggested ceilings", async () => {
  for (const body of [
    "I already paid $50 for gas.",
    "I need at least $170 back.",
    "The deposit was $40.",
    "My budget includes the $40 deposit.",
    "The room costs $170.",
    "$170 is fine for me.",
  ]) {
    const c = (await interpret(`Maya: ${body}`, { source: null }))
      .constraints[0];
    assert.equal(c.budgetCents, null, body);
    assert.equal(c.needsReview, true, body);
  }
  for (const body of [
    "My budget is $170.",
    "Up to $170.",
    "$170 maximum.",
    "My ceiling is $170.",
  ]) {
    const c = (await interpret(`Maya: ${body}`, { source: null }))
      .constraints[0];
    assert.equal(c.budgetCents, 17000, body);
    assert.equal(c.needsReview, false, body);
  }
});
