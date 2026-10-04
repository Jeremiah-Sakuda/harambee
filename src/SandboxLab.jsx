import React, { useEffect, useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
export default function SandboxLab() {
  const [data, setData] = useState(null),
    [amount, setAmount] = useState("1.00"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const r = await fetch("/api/sandbox");
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setData(result);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function action(name, input) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/sandbox/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setData(result);
    } catch (e) {
      setError(e.message);
      await load();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="sandbox-lab">
      <div className="section-heading">
        <div>
          <h2>PayPal sandbox lab</h2>
          <p>A separate, real sandbox checkout for integration feasibility.</p>
        </div>
        <ShieldCheck size={21} />
      </div>
      <div className="alert">
        <AlertCircle size={18} />
        <span>
          These sandbox transactions are separate from the simulated trip. They
          never fund or confirm a cabin booking.
        </span>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p>Loading sandbox configuration…</p>
      ) : (
        <>
          <p className="sandbox-status">
            {data.configured
              ? "Server credentials configured. Use a PayPal sandbox buyer account."
              : "Not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env, then restart the server. No credentials are needed for the trip demo."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action("create", { amount: Math.round(Number(amount) * 100) });
            }}
          >
            <label className="field">
              Sandbox test amount (USD)
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.01"
                min="1"
                max="500"
                required
                disabled={!data.configured || busy}
              />
            </label>
            <button className="primary" disabled={!data.configured || busy}>
              Create PayPal sandbox order <ExternalLink size={14} />
            </button>
          </form>
          {[...data.sessions].reverse().map((s) => (
            <article className="sandbox-session" key={s.id}>
              <div className="sandbox-session-head">
                <strong>${(s.amount / 100).toFixed(2)} USD</strong>
                <span className="status green">
                  {s.status.replaceAll("_", " ")}
                </span>
              </div>
              <p>Order {s.orderId || "response not confirmed"}</p>
              {s.authorizationId && <p>Authorization {s.authorizationId}</p>}
              {s.captureId && <p>Capture {s.captureId}</p>}
              <div className="sandbox-buttons">
                {s.approvalUrl &&
                  ["approval_required", "buyer_approved"].includes(
                    s.status,
                  ) && (
                    <a
                      className="secondary"
                      href={s.approvalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      1. Approve with PayPal <ExternalLink size={13} />
                    </a>
                  )}
                {["approval_required", "buyer_approved"].includes(s.status) && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => action("authorize", { id: s.id })}
                  >
                    2. Confirm authorization
                  </button>
                )}
                {s.status === "authorized" && (
                  <>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => action("capture", { id: s.id })}
                    >
                      Capture ${(s.amount / 100).toFixed(2)} sandbox funds
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => action("void", { id: s.id })}
                    >
                      Void authorization
                    </button>
                  </>
                )}
                {s.status === "captured" && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => action("refund", { id: s.id })}
                  >
                    Refund sandbox capture
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => action("reconcile", { id: s.id })}
                >
                  <RefreshCw size={13} />
                  Reconcile with PayPal
                </button>
              </div>
              <details>
                <summary>Provider operation evidence</summary>
                {s.operations.map((o) => (
                  <p key={o.id}>
                    {o.type} · {o.status} · {o.providerId || o.id}
                    {o.error ? ` · ${o.error}` : ""}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </>
      )}
      <p className="lab-limit">
        Authorization/capture/refund are separate provider operations. Unknown
        results require reconciliation. Webhooks and full group sandbox
        orchestration are not enabled in this prototype.
      </p>
    </section>
  );
}
