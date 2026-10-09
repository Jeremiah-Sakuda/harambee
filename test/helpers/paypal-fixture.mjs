import { Engine, allocate } from "../../server/domain.mjs";
import { SandboxLab } from "../../server/sandbox-lab.mjs";
import { GroupPayments } from "../../server/group-payments.mjs";

// Synthetic provider double, never a PayPal connection.
const memory = () => {
  let disk;
  return {
    load: () => structuredClone(disk),
    save: (s) => {
      disk = structuredClone(s);
    },
  };
};
export function fixture() {
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
    refund: async (id, key) => {
      const c = caps.get(id);
      c.status = "REFUNDED";
      const r = { id: `R${id}-${key}`, status: "COMPLETED", amount: c.amount };
      refunds.set(r.id, r);
      // PayPal's order GET lists refunds under purchase_units[].payments.refunds.
      const payments = orders.get(id.slice(2))?.purchase_units[0].payments;
      if (payments) payments.refunds = [...(payments.refunds ?? []), r];
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
  return {
    e,
    g,
    lab,
    store,
    labStore,
    client,
    approve,
    orders,
    auths,
    caps,
    refunds,
  };
}
