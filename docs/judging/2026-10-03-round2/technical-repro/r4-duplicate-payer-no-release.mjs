// R4: after a duplicate-buyer rejection the hold stays authorized; there is no participant-level release.
import { setup, brief, tryit } from "./harness.mjs";
const f = setup();
const first = await f.approve("maya");
await f.g.approve("jordan", 1);
const second = f.e.state.payments.at(-1);
const s = f.lab.state.sessions.find((x) => x.id === second.sandboxSessionId);
f.client.orders.get(s.orderId).payer.payer_id = first.payerId; // same sandbox buyer logs in twice
await tryit("jordan complete", () => f.g.complete("jordan", { paymentId: second.id, version: 1 }));
console.log(brief(f.e));
await tryit("jordan approve again", () => f.g.approve("jordan", 1));
await tryit("organizer revise same cabin", () => f.g.revise("organizer", {}));
console.log("after same-cabin revise:", brief(f.e), "ready:", f.e.ready());
