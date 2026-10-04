// A transport timeout on authorize that never reached PayPal (order APPROVED, no authorization exists)
// leaves the payment authorize_unknown forever: no retry, release fails, revise/withdraw/recover cannot finish.
import { fixture, tryIt } from "./harness.mjs";
const f = fixture();
await f.approve("maya");
await f.g.approve("jordan", 1);
const p = f.e.state.payments.at(-1);
const realAuth = f.client.authorize;
f.client.authorize = async () => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); };
await tryIt("jordan complete (timeout, never reached PayPal)", () => f.g.complete("jordan", { paymentId: p.id, version: 1 }));
f.client.authorize = realAuth; // network healthy again; PayPal order still APPROVED with no authorization
for (let i = 1; i <= 3; i++) { await tryIt(`reconcile #${i}`, () => f.g.reconcile("jordan", p.id)); console.log("   payment status:", p.status); }
await tryIt("jordan retries complete", () => f.g.complete("jordan", { paymentId: p.id, version: 1 }));
await tryIt("jordan approves again (new checkout)", () => f.g.approve("jordan", 1));
await tryIt("alex withdraws -> organizer revises", async () => { await f.g.withdraw("alex", "alex"); await f.g.revise("organizer", {}); });
await tryIt("organizer expires plan (recovery)", () => f.g.expire("organizer"));
console.log("plan status:", f.e.state.status, "| payments:", f.e.state.payments.map((x) => `${x.participantId}:${x.status}`).join(", "));
console.log("PayPal order for jordan:", f.orders.get(f.lab.state.sessions.find((s) => s.id === p.sandboxSessionId).orderId).status, "auth count:", f.auths.size);
console.log("reset precondition (all voided/refunded/abandoned):", f.e.state.payments.every((x) => ["voided","refunded","abandoned"].includes(x.status)));
