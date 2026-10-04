// Copy of the snapshot's group-payments test fixture (mock PayPal), imported from the frozen snapshot.
import { fileURLToPath } from "node:url";
import path from "node:path";
// Usage: HARAMBEE_DIR=/path/to/checkout node <script> (defaults to this repository).
const SNAP = process.env.HARAMBEE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const { Engine, allocate } = await import(`${SNAP}/server/domain.mjs`);
export const { SandboxLab } = await import(`${SNAP}/server/sandbox-lab.mjs`);
export const { GroupPayments } = await import(`${SNAP}/server/group-payments.mjs`);
export const { proposeRevisions } = await import(`${SNAP}/server/revision-options.mjs`);
export const memory = () => { let disk; return { load: () => structuredClone(disk), save: (s) => { disk = structuredClone(s); } }; };
export function fixture({ n = 3, budget = 35000 } = {}) {
  const store = memory(), labStore = memory(), orders = new Map(), auths = new Map(), caps = new Map(), refunds = new Map();
  let k = 0; const calls = [];
  const amount = (c) => ({ currency_code: "USD", value: (c / 100).toFixed(2) });
  const client = {
    createOrder: async (cents, key) => { calls.push(["create", key]); const o = { id: `O${++k}`, cents, key, status: "APPROVED", payer: { payer_id: `BUYER${k}` }, purchase_units: [] }; orders.set(o.id, o); return { ...o, links: [{ rel: "approve", href: `https://www.sandbox.paypal.com/checkoutnow?token=${o.id}` }] }; },
    authorize: async (id, key) => { calls.push(["authorize", key]); const o = orders.get(id), a = { id: `A${id}`, status: "CREATED", amount: amount(o.cents) }; auths.set(a.id, a); o.purchase_units = [{ payments: { authorizations: [a] } }]; return o; },
    capture: async (id, key) => { calls.push(["capture", key]); const a = auths.get(id); a.status = "CAPTURED"; const c = { id: `C${id}`, status: "COMPLETED", amount: a.amount }; caps.set(c.id, c); orders.get(id.slice(1)).purchase_units[0].payments.captures = [c]; return c; },
    void: async (id, key) => { calls.push(["void", key]); auths.get(id).status = "VOIDED"; return {}; },
    refund: async (id, key) => { calls.push(["refund", key]); const c = caps.get(id); c.status = "REFUNDED"; const r = { id: `R${id}`, status: "COMPLETED", amount: c.amount }; refunds.set(r.id, r); return r; },
    getOrder: async (id) => orders.get(id), getAuthorization: async (id) => auths.get(id), getCapture: async (id) => caps.get(id), getRefund: async (id) => refunds.get(id),
  };
  const e = new Engine(store);
  e.state.provider = "paypal-sandbox";
  e.state.participants = e.state.participants.slice(0, n);
  e.state.participants.forEach((p) => (p.budget = budget));
  e.current.shares = allocate(60000, e.active);
  e.persist();
  const lab = new SandboxLab(labStore, client), g = new GroupPayments(e, lab);
  const approve = async (actor) => { await g.approve(actor, e.state.version); const p = e.state.payments.at(-1); await g.complete(actor, { paymentId: p.id, version: e.state.version }); return p; };
  return { e, g, lab, store, labStore, client, approve, orders, auths, caps, calls };
}
export const tryIt = async (label, fn) => { try { const r = await fn(); console.log(`${label}: OK`, r ?? ""); } catch (err) { console.log(`${label}: REJECTED -> ${err.message}`); } };
