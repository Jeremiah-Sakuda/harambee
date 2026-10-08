import test from "node:test";
import assert from "node:assert/strict";
import { Engine, allocate } from "/private/tmp/paypal-judging-20261007-harambee-4ed2d00/server/domain.mjs";
import { SandboxLab } from "/private/tmp/paypal-judging-20261007-harambee-4ed2d00/server/sandbox-lab.mjs";
import { GroupPayments } from "/private/tmp/paypal-judging-20261007-harambee-4ed2d00/server/group-payments.mjs";
const memory = () => {
  let disk;
  return {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  };
};
function fixture() {
  const store = memory(),
    labStore = memory(),
    orders = new Map(),
    auths = new Map(),
    caps = new Map(),
    refunds = new Map();
  let n = 0;
  const amount = (n) => ({ currency_code: "USD", value: (n / 100).toFixed(2) });
  const client = {
    createOrder: async (cents, key) => {
      const o = {
        id: `O${++n}`,
        cents,
        key,
        status: "APPROVED",
        payer: { payer_id: `BUYER${n}` },
        purchase_units: [],
      };
      orders.set(o.id, o);
      return {
        ...o,
        links: [
          {
            rel: "approve",
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${o.id}`,
          },
        ],
      };
    },
    authorize: async (id) => {
      const o = orders.get(id),
        a = { id: `A${id}`, status: "CREATED", amount: amount(o.cents) };
      auths.set(a.id, a);
      o.purchase_units = [{ payments: { authorizations: [a] } }];
      return o;
    },
    capture: async (id) => {
      const a = auths.get(id);
      a.status = "CAPTURED";
      const c = { id: `C${id}`, status: "COMPLETED", amount: a.amount };
      caps.set(c.id, c);
      orders.get(id.slice(1)).purchase_units[0].payments.captures = [c];
      return c;
    },
    void: async (id) => {
      auths.get(id).status = "VOIDED";
      return {};
    },
    refund: async (id) => {
      const c = caps.get(id);
      c.status = "REFUNDED";
      const r = { id: `R${id}`, status: "COMPLETED", amount: c.amount };
      refunds.set(r.id, r);
      return r;
    },
    getOrder: async (id) => orders.get(id),
    getAuthorization: async (id) => auths.get(id),
    getCapture: async (id) => caps.get(id),
    getRefund: async (id) => refunds.get(id),
  };
  const e = new Engine(store);
  e.state.provider = "paypal-sandbox";
  e.state.participants = e.state.participants.slice(0, 3);
  e.state.participants.forEach((p) => (p.budget = 35000));
  e.current.shares = allocate(60000, e.active);
  e.persist();
  const lab = new SandboxLab(labStore, client),
    g = new GroupPayments(e, lab);
  const approve = async (actor) => {
    await g.approve(actor, e.state.version);
    const p = e.state.payments.at(-1);
    await g.complete(actor, { paymentId: p.id, version: e.state.version });
    return p;
  };
  return { e, g, lab, store, labStore, client, approve, orders, auths, caps };
}

// Judge's isolated fixture. No network or provider credentials.
// Run: node recovery-repro.mjs
const results=[];
for (const scenario of ['failed-refund', 'declined-capture']) {
  const f=fixture();
  for(const p of f.e.active) await f.approve(p.id);
  let refundCalls=0, voidCalls=0;
  const oldVoid=f.client.void;
  f.client.void=async(...args)=>{voidCalls++; return oldVoid(...args);};
  if(scenario==='failed-refund') {
    const oldRefund=f.client.refund;
    const oldGetRefund=f.client.getRefund;
    f.client.getRefund=async(rid)=>({...await oldGetRefund(rid),status:'FAILED'});
    f.client.refund=async(id,key)=>{
      refundCalls++;
      const r=await oldRefund(id,key);
      f.caps.get(id).status='COMPLETED';
      r.status='PENDING';
      return r;
    };
  } else {
    f.client.capture=async(id,key)=>{
      const a=f.auths.get(id);
      const c={id:`DECLINED-${id}`, status:'DECLINED', amount:a.amount};
      f.caps.set(c.id,c);
      f.orders.get(id.slice(1)).purchase_units[0].payments.captures=[c];
      return c;
    };
  }
  try { await f.g.book('organizer',{version:1,fault:scenario==='failed-refund'?'reservation_failure':'none'}); } catch {}
  const rows=[];
  for(let pass=1;pass<=3;pass++) {
    // Re-create from persisted snapshots to cover restarts.
    const e=new Engine(f.store);
    const lab=new SandboxLab(f.labStore,f.client);
    const group=new GroupPayments(e,lab);
    await group.recover('organizer');
    rows.push({pass,status:e.state.status,payments:e.state.payments.map(p=>({status:p.status,recoveryError:p.recoveryError})),refundCalls,voidCalls});
  }
  results.push({scenario,rows});
}

console.log(JSON.stringify(results,null,2));
