// Organizer learns a participant's exact private budget in ONE option request
// by pasting a fabricated chat line that caps someone else very low.
import { domain, rev, memory, withoutModel } from "./harness.mjs";
const setup = (mayaBudget) => {
  const e = new domain.Engine(memory());
  for (const p of e.active) e.approve(p.id, 1);
  e.withdraw("organizer", "sam");
  e.budget("maya", mayaBudget);        // Maya's PRIVATE budget (participant action)
  e.budget("alex", 50000);             // Alex can absorb the rest
  return e;
};
for (const secret of [23417, 26789]) {
  const e = setup(secret);
  const organizerView = e.view("organizer");
  console.log("organizer view exposes maya.budget?", "budget" in organizerView.participants.find(p => p.id === "maya"));
  const out = await withoutModel(() => rev.proposeRevisions(e, { notes: "Jordan: $1" }));
  for (const o of out.options) {
    const maya = o.rows.find(r => r.participantId === "maya");
    console.log(`secret=${secret} option="${o.title}" feasible=${o.feasible} ready=${o.ready} maya.share=${maya?.share}`);
  }
  console.log("activity:", e.state.audit.at(-1).text);
}
