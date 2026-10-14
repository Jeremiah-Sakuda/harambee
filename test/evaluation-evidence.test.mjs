import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (args) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      ["scripts/evaluate-noamount-strict.mjs", ...args],
      { encoding: "utf8", maxBuffer: 1 << 26 },
    ),
  );
test("strict rescoring retains original acquisition, fallback, usage and verified evidence", () => {
  const dir = mkdtempSync(join(tmpdir(), "harambee-evidence-"));
  try {
    const cases = [{ id: "fixture", expect: { askWho: "maya" } }];
    const original = {
      mode: "live-model",
      cases: "fixture",
      casesSha256: "fixture-sha",
      fallbacks: 1,
      source: { commit: "frozen-fixture", sha256: {} },
      requestedModel: "fixture-model",
      results: [
        {
          id: "fixture",
          checks: { noInventedLimit: true },
          model: "fixture-model-version",
          latencyMs: 123,
          usage: { input_tokens: 42 },
          fallbackReason: "fixture failure",
          questions: ["code: maya: Confirm your limit?"],
          options: [],
          acquisition: {
            outcome: "failed",
            request: { maxOutputTokens: 2000 },
            response: null,
          },
          verifiedOutput: {
            clarifications: [{ participantId: "maya", source: "code" }],
            options: [],
          },
        },
      ],
    };
    const path = join(dir, "source.json"),
      corpus = join(dir, "cases.json");
    writeFileSync(path, JSON.stringify(original));
    writeFileSync(corpus, JSON.stringify(cases));
    const report = run(["--rescore", path, "--cases", corpus]);
    assert.deepEqual(report.originalRun, original);
    assert.deepEqual(
      report.results[0].acquisition,
      original.results[0].acquisition,
    );
    assert.deepEqual(
      report.results[0].verifiedOutput,
      original.results[0].verifiedOutput,
    );
    assert.equal(report.results[0].questionRecall.modelAnswered, 0);
    assert.equal(report.results[0].questionRecall.pipelineAnswered, 1);
    assert.ok(
      report.scorerSource.sha256["scripts/evaluate-noamount-strict.mjs"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("a fresh offline evaluation saves complete outputs without model credentials", () => {
  const report = run([]);
  assert.equal(report.originalRun.mode, "local-planner");
  assert.equal(report.originalRun.requestedModel, null);
  assert.ok(report.originalRun.startedAt);
  for (const result of report.results) {
    assert.equal(result.acquisition, null);
    assert.ok(Array.isArray(result.verifiedOutput.options));
    assert.ok(Array.isArray(result.verifiedOutput.clarifications));
    assert.equal(result.model, null);
    assert.equal(typeof result.elapsedMs, "number");
    assert.ok(Object.hasOwn(result, "fallbackReason"));
  }
});
