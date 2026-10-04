// An order the buyer never approved later returns 404 on GET (assumption: PayPal expires/purges
// unapproved orders). reconcile has no path from a definite 404 to "abandoned", so withdraw,
// revise, expiry recovery and reset all stay blocked. No money is at risk; the plan is wedged.
import { sandbox, group } from "./harness.mjs";
const c = sandbox();
const { e, g, lab, approve } = group(c, 4, 35000);
await approve("jordan"); await approve("alex"); await approve("sam");
await g.approve("maya", 1);                       // order created, Maya never finishes checkout
const maya = e.state.payments.find(p => p.participantId === "maya");
console.log("maya payment:", maya.status);
c.orders.delete(lab.state.sessions.find(s => s.id === maya.sandboxSessionId).orderId); // simulate expiry -> GET 404
for (const [label, f] of [
  ["withdraw maya", () => g.withdraw("organizer", "maya")],
  ["reconcile maya", () => g.reconcile("organizer", maya.id)],
  ["expire plan", () => g.expire("organizer")],
  ["recover again", () => g.recover("organizer")],
]) {
  try { await f(); console.log(label, "-> ok; plan", e.state.status); }
  catch (err) { console.log(label, "-> ERROR", err.status, err.message, "| plan", e.state.status); }
}
console.log("payments:", e.state.payments.map(p => `${p.participantId}:${p.status}${p.recoveryError ? " (" + p.recoveryError + ")" : ""}`).join(", "));
const settled = e.state.payments.every(p => ["voided", "refunded", "abandoned"].includes(p.status));
console.log("/api/reset would be allowed:", settled);
