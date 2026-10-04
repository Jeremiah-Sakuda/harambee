// R5: a 4xx authorize (e.g. buyer has not approved yet -> 422 ORDER_NOT_APPROVED) marks the op "failed";
// the retry reuses the same op id as PayPal-Request-Id.
import { setup, brief, tryit } from "./harness.mjs";
const f = setup();
await f.g.approve("maya", 1);
const p = f.e.state.payments[0];
const real = f.client.authorize; let first = true;
f.client.authorize = async (id, key) => { if (first) { first = false; f.client.calls.push(["authorize", key]); throw Object.assign(Error("ORDER_NOT_APPROVED"), { status: 422 }); } return real(id, key); };
await tryit("complete before buyer approval", () => f.g.complete("maya", { paymentId: p.id, version: 1 }));
await tryit("complete after buyer approval", () => f.g.complete("maya", { paymentId: p.id, version: 1 }));
const keys = f.client.calls.filter((c) => c[0] === "authorize").map((c) => c[1]);
console.log("authorize PayPal-Request-Id values:", keys, "same key reused:", keys[0] === keys[1]);
console.log(brief(f.e));
