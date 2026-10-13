// Frozen transparent comparator: source-linked cabin preferences and targeted questions.
// Deliberately separate from the application/model verifier. A development baseline, not user data.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { splitSpeaker } from "../server/ai.mjs";
import { sourceFingerprint } from "./lib/source-fingerprint.mjs";
const casesFlag = process.argv.indexOf("--cases");
const casesPath =
  casesFlag > 0
    ? process.argv[casesFlag + 1]
    : new URL("../eval/revision-cases-noamount.json", import.meta.url);
const cases = JSON.parse(readFileSync(casesPath, "utf8"));
const people = ["maya", "jordan", "alex"];
export function ruleReading(chat) {
  const questions = new Set(),
    support = [],
    objections = [];
  for (const line of chat) {
    const { person, body } = splitSpeaker(line),
      who = person.toLowerCase().split(" ")[0];
    if (!people.includes(who)) continue;
    const mentioned = people.find(
      (p) => p !== who && new RegExp(`\\b${p}\\b`, "i").test(body),
    );
    if (mentioned && /\b(told me|said|says|mentioned)\b/i.test(body)) {
      questions.add(mentioned);
      continue;
    }
    const refuses =
      /(?:can['’]?t|cannot|won['’]?t|don['’]?t)[^.!?]{0,35}(?:pay|spend|more|afford)/i.test(
        body,
      );
    if (
      refuses ||
      /\b(?:stretch|higher|cover|might not come|not sure.*(?:come|join)|maybe.*(?:come|join))\b/i.test(
        body,
      )
    )
      questions.add(who);
    if (refuses) {
      objections.push(
        { participantId: who, listingId: "pine" },
        { participantId: who, listingId: "creek" },
      );
      continue;
    }
    for (const [word, id, other] of [
      ["pine", "pine", "creek"],
      ["creek", "creek", "pine"],
    ]) {
      if (!new RegExp(`\\b${word}(?:side)?\\b`, "i").test(body)) continue;
      const against = new RegExp(
        `(?:not|avoid|skip|don['’]?t want)[^.!?]{0,25}\\b${word}`,
        "i",
      ).test(body);
      if (against) {
        objections.push({ participantId: who, listingId: id });
        support.push({ participantId: who, listingId: other });
      } else support.push({ participantId: who, listingId: id });
    }
    if (/\b(?:cheapest|cheaper|lowest cost)\b/i.test(body))
      support.push({ participantId: who, listingId: "creek" });
  }
  return { questions: [...questions], support, objections };
}
const results = cases.map((c) => {
  const observed = ruleReading(c.chat),
    has = (list, item) =>
      list.some(
        (x) =>
          x.participantId === item.participantId &&
          x.listingId === item.listingId,
      );
  const checks = {
    noInventedLimit: true,
    ...(c.expect.askWho
      ? { asksRightPerson: observed.questions.includes(c.expect.askWho) }
      : {}),
    ...(c.expect.support
      ? {
          wordsBackTheirChoice: c.expect.support.every((s) =>
            has(observed.support, s),
          ),
        }
      : {}),
    ...(c.expect.objection
      ? {
          objectionNeverAWhy: c.expect.objection.every(
            (s) => !has(observed.support, s),
          ),
        }
      : {}),
  };
  if (c.id === "na-no-more")
    checks.refusalNeverAWhy = !observed.support.some(
      (s) => s.participantId === "alex",
    );
  return {
    id: c.id,
    pass: Object.values(checks).every(Boolean),
    checks,
    observed,
    requiredQuestion: c.expect.askWho ?? null,
  };
});
const needed = results.filter((r) => r.requiredQuestion);
const report = {
  source: sourceFingerprint([
    "scripts/noamount-rules-baseline.mjs",
    "server/ai.mjs",
  ]),
  mode: "rules-baseline",
  corpus:
    "development no-amount briefs; rules authored after inspecting this corpus",
  passed: results.filter((r) => r.pass).length,
  total: results.length,
  questionRecall: {
    required: needed.length,
    answered: needed.filter((r) =>
      r.observed.questions.includes(r.requiredQuestion),
    ).length,
  },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--write"))
  writeFileSync(
    new URL("../eval/noamount-rules-baseline.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
