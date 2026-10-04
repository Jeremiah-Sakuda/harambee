// Lost capture response. (a) order GET shows captures -> refund, no double charge.
// (b) order GET omits captures, key still stored -> replay returns original capture.
// (c) order GET omits captures AND idempotency key no longer stored -> replay gets 422,
//     reconcile re-flags the same op as unknown every time: captured funds never refunded.
import { sandbox, group } from "./harness.mjs";
async function run(label, { orderShowsCaptures, expireKeys }) {
  const c = sandbox({ orderShowsCaptures });
  const { e, g, approve } = group(c, 3);
  for (const p of e.active) await approve(p.id);
  const real = c.capture; let lose = true;
  c.capture = async (id, key) => { const r = await real(id, key); if (lose) { lose = false; throw new Error("socket hang up"); } return r; };
  try { await g.book("organizer", { version: 1 }); } catch (err) { }
  if (expireKeys) c.seen.clear();
  for (let i = 0; i < 3; i++) { try { await g.recover("organizer"); } catch (err) { console.log("  recover err", err.message); } }
  console.log(label, "| plan:", e.state.status, "| payments:", e.state.payments.map(p => p.status).join(","),
    "| captures executed:", c.counts.capture, "refunds:", c.counts.refund,
    "| recoveryError:", e.state.payments.map(p => p.recoveryError).filter(Boolean)[0] ?? "-");
}
await run("(a) order shows captures       ", { orderShowsCaptures: true, expireKeys: false });
await run("(b) no captures on order, key ok", { orderShowsCaptures: false, expireKeys: false });
await run("(c) no captures, key expired    ", { orderShowsCaptures: false, expireKeys: true });
