// R2: a share outside the lab's $1–$500 bound leaves a "created" payment with no provider session.
// release() always calls lab "reconcile" -> 404, so revise/withdraw/expire/reset can never finish.
import { setup, brief, tryit } from "./harness.mjs";
const f = setup({ budget: null });
f.e.state.participants.forEach((p) => (p.budget = null));
f.e.persist();
f.e.budget("maya", 50); // $0.50 private ceiling (domain allows any positive cents)
console.log("status after Maya's $0.50 budget:", f.e.state.status);
await tryit("organizer revise (same cabin)", () => f.g.revise("organizer", {}));
console.log("v2 shares:", JSON.stringify(f.e.current.shares));
await tryit("maya approve v2", () => f.g.approve("maya", f.e.state.version));
console.log("after approve:", brief(f.e));
const p = f.e.state.payments[0];
await tryit("maya approve again", () => f.g.approve("maya", f.e.state.version));
await tryit("maya reconcile", () => f.g.reconcile("maya", p.id));
await tryit("organizer revise", () => f.g.revise("organizer", {}));
await tryit("withdraw maya", () => f.g.withdraw("organizer", "maya"));
await tryit("organizer expire", () => f.g.expire("organizer"));
console.log("final:", brief(f.e));
console.log("reset allowed?", !f.e.state.payments.some((x) => !["voided", "refunded", "abandoned"].includes(x.status)));
