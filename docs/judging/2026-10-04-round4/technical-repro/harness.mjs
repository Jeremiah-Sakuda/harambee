import { fileURLToPath } from "node:url";
import path from "node:path";
// Usage: HARAMBEE_DIR=/path/to/checkout node <script> (defaults to this repository).
const SNAP = process.env.HARAMBEE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const domain = await import(`${SNAP}/server/domain.mjs`);
export const rev = await import(`${SNAP}/server/revision-options.mjs`);
export const { SandboxLab } = await import(`${SNAP}/server/sandbox-lab.mjs`);
export const { GroupPayments } = await import(`${SNAP}/server/group-payments.mjs`);
export const memory = () => { let d; return { load: () => structuredClone(d), save: (s) => { d = structuredClone(s); } }; };
export async function withModel(fn, result) {
  const f = globalThis.fetch, k = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "stub";
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: "completed", model: "stub-model",
    output: [{ content: [{ type: "output_text", text: JSON.stringify(result) }] }] }) });
  try { return await fn(); } finally { globalThis.fetch = f; if (k) process.env.OPENAI_API_KEY = k; else delete process.env.OPENAI_API_KEY; }
}
export async function withoutModel(fn) {
  const k = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  try { return await fn(); } finally { if (k) process.env.OPENAI_API_KEY = k; }
}
// Sandbox fake: realistic-ish PayPal state machine with idempotency keyed by request id.
export function sandbox({ orderShowsCaptures = true } = {}) {
  const orders = new Map(), auths = new Map(), caps = new Map(), refunds = new Map(), seen = new Map();
  let n = 0; const amt = (c) => ({ currency_code: "USD", value: (c / 100).toFixed(2) });
  const err = (status, issue) => Object.assign(new Error(`PayPal sandbox request failed (${status})`), { status, details: { details: [{ issue }] } });
  const idem = (key, f) => { if (key && seen.has(key)) return seen.get(key); const r = f(); if (key) seen.set(key, r); return r; };
  const counts = { create: 0, authorize: 0, capture: 0, void: 0, refund: 0 };
  const client = {
    counts, orders, auths, caps, seen,
    createOrder: async (cents, key) => idem(key, () => { counts.create++; const o = { id: `O${++n}`, cents, status: "APPROVED", payer: { payer_id: `BUYER${n}` }, purchase_units: [{}] }; orders.set(o.id, o);
      return { id: o.id, status: "CREATED", links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${o.id}` }] }; }),
    authorize: async (id, key) => idem(key, () => { const o = orders.get(id); if (o.purchase_units[0].payments) throw err(422, "ORDER_ALREADY_AUTHORIZED");
      counts.authorize++; const a = { id: `A${id}`, status: "CREATED", amount: amt(o.cents) }; auths.set(a.id, a); o.status = "COMPLETED"; o.purchase_units[0].payments = { authorizations: [a] }; return structuredClone(o); }),
    capture: async (id, key) => idem(key, () => { const a = auths.get(id); if (a.status !== "CREATED") throw err(422, "AUTHORIZATION_ALREADY_CAPTURED");
      counts.capture++; a.status = "CAPTURED"; const c = { id: `C${id}`, status: "COMPLETED", amount: a.amount }; caps.set(c.id, c);
      if (orderShowsCaptures) orders.get(id.slice(1)).purchase_units[0].payments.captures = [c]; return structuredClone(c); }),
    void: async (id, key) => idem(key, () => { const a = auths.get(id); if (a.status !== "CREATED") throw err(422, "CANNOT_BE_VOIDED"); counts.void++; a.status = "VOIDED"; return structuredClone(a); }),
    refund: async (id, key) => idem(key, () => { const c = caps.get(id); if (c.status !== "COMPLETED") throw err(422, "CAPTURE_FULLY_REFUNDED"); counts.refund++; c.status = "REFUNDED";
      const r = { id: `R${id}`, status: "COMPLETED", amount: c.amount }; refunds.set(r.id, r); return structuredClone(r); }),
    getOrder: async (id) => { const o = orders.get(id); if (!o) throw err(404, "RESOURCE_NOT_FOUND"); return structuredClone(o); },
    getAuthorization: async (id) => structuredClone(auths.get(id)),
    getCapture: async (id) => structuredClone(caps.get(id)),
    getRefund: async (id) => structuredClone(refunds.get(id)),
  };
  return client;
}
export function group(client, n = 3, budget = 35000) {
  const e = new domain.Engine(memory());
  e.state.provider = "paypal-sandbox";
  e.state.participants = e.state.participants.slice(0, n);
  e.state.participants.forEach((p) => (p.budget = budget));
  e.current.shares = domain.allocate(60000, e.active);
  e.persist();
  const lab = new SandboxLab(memory(), client), g = new GroupPayments(e, lab);
  const approve = async (actor) => { await g.approve(actor, e.state.version); const p = e.state.payments.at(-1); await g.complete(actor, { paymentId: p.id, version: e.state.version }); return p; };
  return { e, lab, g, approve };
}
export const age = (lab, type, ms = 61000) => { for (const s of lab.state.sessions) for (const o of s.operations) if (o.type === type) o.at = new Date(Date.parse(o.at) - ms).toISOString(); };
