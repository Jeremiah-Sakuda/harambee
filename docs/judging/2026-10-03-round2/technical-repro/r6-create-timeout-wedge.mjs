// R6: an order-create timeout leaves no orderId; reconcile refuses forever (no re-POST with the same
// PayPal-Request-Id to recover the order), so recovery and reset can never complete.
import { setup, brief, tryit } from "./harness.mjs";
const f = setup();
const real = f.client.createOrder;
f.client.createOrder = async () => { throw Error("socket timeout"); };
await tryit("maya approve (create times out)", () => f.g.approve("maya", 1));
f.client.createOrder = real;
const p = f.e.state.payments[0];
await tryit("maya reconcile", () => f.g.reconcile("maya", p.id));
await tryit("organizer expire", () => f.g.expire("organizer"));
await tryit("organizer recover again", () => f.g.recover("organizer"));
console.log(brief(f.e));
