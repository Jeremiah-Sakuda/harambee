// A capture request that timed out before reaching PayPal: the hold is still CREATED at PayPal,
// but the app never replays the same PayPal-Request-Id nor voids, so recovery stays open indefinitely.
import { fixture, tryIt } from "./harness.mjs";
const f = fixture();
for (const p of f.e.active) await f.approve(p.id);
const real = f.client.capture;
f.client.capture = async () => { throw new Error("socket hang up"); };
await tryIt("book", () => f.g.book("organizer", { version: 1 }));
f.client.capture = real;
for (let i = 1; i <= 3; i++) await tryIt(`recover #${i}`, () => f.g.recover("organizer"));
console.log("plan:", f.e.state.status, "| payments:", f.e.state.payments.map((x) => `${x.participantId}:${x.status}`).join(", "));
console.log("PayPal authorization statuses:", [...f.auths.values()].map((a) => `${a.id}:${a.status}`).join(", "));
console.log("recoveryError:", f.e.state.payments[0].recoveryError);
