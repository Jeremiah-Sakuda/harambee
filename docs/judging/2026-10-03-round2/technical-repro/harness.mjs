// Shared harness: imports snapshot server modules read-only, with in-memory stores and a fake PayPal.
import { fileURLToPath } from "node:url";
import path from "node:path";
// Usage: HARAMBEE_DIR=/path/to/checkout node r1-minimal-capture.mjs (defaults to this repository).
const SNAP = process.env.HARAMBEE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const { Engine, allocate } = await import(`${SNAP}/server/domain.mjs`);
export const { SandboxLab } = await import(`${SNAP}/server/sandbox-lab.mjs`);
export const { GroupPayments } = await import(`${SNAP}/server/group-payments.mjs`);
export const memory = () => { let disk; return { load: () => structuredClone(disk), save: (s) => { disk = structuredClone(s); } }; };
// minimal=true mimics PayPal Payments v2 default `Prefer: return=minimal` (id, status, links only)
export function fakePayPal({ minimal = false } = {}) {
  const orders = new Map(), auths = new Map(), caps = new Map(), refunds = new Map(), calls = [];
  let n = 0;
  const amount = (c) => ({ currency_code: "USD", value: (c / 100).toFixed(2) });
  const links = [{ rel: "self", method: "GET", href: "https://api-m.sandbox.paypal.com/x" }];
  const client = {
    calls, orders, auths, caps, refunds,
    createOrder: async (cents, key) => { calls.push(["create", key]); const o = { id: `O${++n}`, cents, status: "APPROVED", payer: { payer_id: `BUYER${n}` }, purchase_units: [] }; orders.set(o.id, o); return { id: o.id, status: "CREATED", links: [{ rel: "approve", href: `https://www.sandbox.paypal.com/checkoutnow?token=${o.id}` }] }; },
    authorize: async (id, key) => { calls.push(["authorize", key]); const o = orders.get(id); const a = { id: `A${id}`, status: "CREATED", amount: amount(o.cents) }; auths.set(a.id, a); o.purchase_units = [{ payments: { authorizations: [a] } }]; o.status = "COMPLETED"; return structuredClone(o); },
    capture: async (id, key) => { calls.push(["capture", key]); const a = auths.get(id); a.status = "CAPTURED"; const c = { id: `C${id}`, status: "COMPLETED", amount: a.amount }; caps.set(c.id, c); orders.get(id.slice(1)).purchase_units[0].payments.captures = [c]; return minimal ? { id: c.id, status: c.status, links } : structuredClone(c); },
    void: async (id, key) => { calls.push(["void", key]); auths.get(id).status = "VOIDED"; return {}; },
    refund: async (id, key) => { calls.push(["refund", key]); const c = caps.get(id); c.status = "REFUNDED"; const r = { id: `R${id}`, status: "COMPLETED", amount: c.amount }; refunds.set(r.id, r); return minimal ? { id: r.id, status: r.status, links } : structuredClone(r); },
    getOrder: async (id) => structuredClone(orders.get(id)),
    getAuthorization: async (id) => structuredClone(auths.get(id)),
    getCapture: async (id) => structuredClone(caps.get(id)),
    getRefund: async (id) => structuredClone(refunds.get(id)),
  };
  return client;
}
export function setup({ minimal = false, people = 3, budget = 35000 } = {}) {
  const store = memory(), labStore = memory(), client = fakePayPal({ minimal });
  const e = new Engine(store);
  e.state.provider = "paypal-sandbox";
  e.state.participants = e.state.participants.slice(0, people);
  e.state.participants.forEach((p) => (p.budget = budget));
  e.current.shares = allocate(60000, e.active);
  e.persist();
  const lab = new SandboxLab(labStore, client), g = new GroupPayments(e, lab);
  const approve = async (actor) => { await g.approve(actor, e.state.version); const p = e.state.payments.at(-1); await g.complete(actor, { paymentId: p.id, version: e.state.version }); return p; };
  return { e, g, lab, client, store, labStore, approve };
}
export const brief = (e) => ({ status: e.state.status, payments: e.state.payments.map((p) => `${p.participantId}:${p.amount}:${p.status}${p.recoveryError ? " err=" + p.recoveryError : ""}`) });
export const tryit = async (label, fn) => { try { const r = await fn(); console.log(`  ${label}: OK`, r ?? ""); } catch (err) { console.log(`  ${label}: THROWS ${err.status ?? ""} ${err.message}`); } };
