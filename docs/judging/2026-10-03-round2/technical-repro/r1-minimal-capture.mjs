// R1: PayPal Payments v2 capture/refund default to `Prefer: return=minimal` (id, status, links).
// The adapter sends no Prefer header, and sandbox-lab verifies r.amount on the capture/refund response.
import { setup, brief, tryit } from "./harness.mjs";
for (const minimal of [false, true]) {
  console.log(`\n== capture/refund responses ${minimal ? "MINIMAL (PayPal default)" : "FULL (what tests mock)"} ==`);
  const f = setup({ minimal });
  for (const p of f.e.active) await f.approve(p.id);
  console.log("  ready:", f.e.ready());
  await tryit("book", () => f.g.book("organizer", { version: 1 }));
  console.log("  after book:", brief(f.e), "provider capture calls:", f.client.calls.filter((c) => c[0] === "capture").length, "provider-side capture status:", [...f.client.caps.values()].map((c) => c.status));
  if (f.e.state.status === "recovery_pending") {
    await tryit("recover #1", () => f.g.recover("organizer"));
    console.log("  after recover #1:", brief(f.e));
    await tryit("recover #2", () => f.g.recover("organizer"));
    console.log("  after recover #2:", brief(f.e));
  }
}
