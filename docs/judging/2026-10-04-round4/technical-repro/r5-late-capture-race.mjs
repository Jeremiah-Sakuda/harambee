// Capture times out; after the 60 s settle window recovery assumes it never executed and voids.
// Race: the delayed capture lands at PayPal just before the void. Does the code converge?
import { sandbox, group, age } from "./harness.mjs";
const c = sandbox();
const { e, g, lab, approve } = group(c, 3);
for (const p of e.active) await approve(p.id);
const real = c.capture; let pending = null;
c.capture = async (id, key) => { if (!pending) { pending = () => real(id, key); throw new Error("timeout"); } return real(id, key); };
try { await g.book("organizer", { version: 1 }); } catch {}
age(lab, "capture");
const realVoid = c.void; let landed = false;
c.void = async (id, key) => { if (!landed && pending) { landed = true; await pending(); } return realVoid(id, key); }; // late capture lands first
for (let i = 1; i <= 3; i++) {
  try { await g.recover("organizer"); } catch (err) { console.log("recover", i, "err:", err.message); }
  console.log(`after recover ${i}:`, e.state.status, e.state.payments.map(p => p.status).join(","), "| errors:", e.state.payments.map(p => p.recoveryError).filter(Boolean).join(" ; ") || "-");
  e.state.payments.forEach(p => delete p.recoveryError);
}
console.log("captures executed:", c.counts.capture, "refunds:", c.counts.refund, "voids:", c.counts.void);
