// R3: sandbox GroupPayments.book() has no status gate; the simulated Engine.book requires status === "ready".
import { setup, brief, tryit } from "./harness.mjs";
const f = setup();
for (const p of f.e.active) await f.approve(p.id);
f.e.budget("maya", 100); // below her $200 share -> revision_required
f.e.budget("maya", 35000); // raised back; status is not recomputed
console.log("status:", f.e.state.status, "ready():", f.e.ready());
await tryit("organizer book while revision_required", () => f.g.book("organizer", { version: 1 }));
console.log(brief(f.e));
