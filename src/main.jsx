import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ShieldCheck,
  Leaf,
  MapPin,
  CalendarDays,
  Users,
  Plus,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Clock3,
  FileText,
  AlertCircle,
  LockKeyhole,
  LogOut,
  CheckCircle2,
  Sparkles,
  ReceiptText,
  Download,
  X,
  Wallet,
  Mountain,
  Settings2,
} from "lucide-react";
import "./style.css";
import SandboxLab from "./SandboxLab.jsx";
import RevisionOptions from "./RevisionOptions.jsx";
import LimitRequest from "./LimitRequest.jsx";
const usd = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 100 === 0 ? 0 : 2,
  }).format((n || 0) / 100);
const label = (s) => s.replaceAll("_", " ");
function Cabin() {
  return (
    <svg
      viewBox="0 0 700 340"
      role="img"
      aria-label="Illustration of a warm cabin in a quiet mountain forest"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#bfcdbb" />
          <stop offset="1" stopColor="#e6e3cc" />
        </linearGradient>
        <linearGradient id="grass" x2="0" y2="1">
          <stop stopColor="#627b54" />
          <stop offset="1" stopColor="#344e3c" />
        </linearGradient>
      </defs>
      <path fill="url(#sky)" d="M0 0h700v340H0z" />
      <circle cx="502" cy="61" r="35" fill="#f3ebc6" />
      <path
        fill="#91a58e"
        d="M0 159 85 84l114 89 149-126 128 105 116-87 108 76v199H0z"
      />
      <path
        fill="#758d74"
        d="m0 180 165-62 114 111 165-83 160 65 96-39v168H0z"
      />
      <path fill="url(#grass)" d="M0 253q148-70 311-14t389-9v110H0z" />
      {[
        [-20, 0, 1.3],
        [72, 60, 0.85],
        [146, 84, 0.65],
        [542, 49, 1],
        [624, -20, 1.5],
        [584, 120, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path
            d="M40 25 9 89h15L0 139h20L-9 193h41v58h15v-58h39l-29-54h19L53 89h14z"
            fill={i % 2 ? "#3e6046" : "#284c3b"}
          />
        </g>
      ))}
      <path d="m255 286 105-18 83 72H287z" fill="#a39d77" />
      <path fill="#a98259" d="M254 181h211v93H254z" />
      <path fill="#cca97c" d="M254 181h92v93h-92z" />
      <path fill="#334c3f" d="m228 185 74-85 190 14-47 72z" />
      <path fill="#233d32" d="m302 100 76 85h-26l-50-57-50 57h-24z" />
      <path fill="#bf9c72" d="m258 180 44-51 44 51z" />
      <path fill="#496454" d="M272 195h31v43h-31zm105 1h57v41h-57z" />
      <path fill="#f0c778" d="M278 201h19v31h-19zm104 1h46v29h-46z" />
      <path
        stroke="#725d41"
        strokeWidth="4"
        d="M288 201v31m117-30v29m-23-14h46"
      />
      <path fill="#3b4e3c" d="M317 217h24v57h-24z" />
      <path fill="#e5bf73" d="M322 222h14v24h-14z" />
      <path fill="#6c5543" d="M349 121v-30h20v33z" />
      <path
        fill="#728367"
        d="M0 305q110-45 215-16l-13 51H0zm438-9q102-20 262-15v59H465z"
      />
      <g stroke="#c2bd93" opacity=".6">
        <path d="m60 319 5-12m3 13 9-8m436 7 4-14m4 16 10-12m-299 22 4-9" />
      </g>
    </svg>
  );
}
function App() {
  const [state, setState] = useState(null),
    [actor, setActor] = useState(
      () =>
        new URLSearchParams(location.search).get("participant") || "organizer",
    ),
    [tab, setTab] = useState("board"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(null),
    [fault, setFault] = useState("none"),
    [notes, setNotes] = useState(
      [
        "Maya: I can spend up to $220. A quiet room would be lovely.",
        "Jordan: My budget is $220. I’m happy to share a room.",
        "Alex: Up to $220 works for me. I might arrive late Friday.",
        "Sam: $220 maximum. I need to leave Sunday morning.",
        "Sam: Bad news, work moved my deadline. I have to drop out, sorry!",
        "Maya: Honestly my rent just went up, I can’t go above $170 now.",
        "Alex: If it gets pricey I’d rather do the cheaper Creekside place than pay more.",
        "Jordan: I can stretch a bit if that keeps us at Pine & Still.",
      ].join("\n"),
    ),
    [insight, setInsight] = useState(null),
    [revOptions, setRevOptions] = useState(null),
    [revBusy, setRevBusy] = useState(false),
    [title, setTitle] = useState("A weekend off the grid"),
    [names, setNames] = useState(
      "Maya Chen, Jordan Ellis, Alex Rivera, Sam Taylor",
    ),
    [listingId, setListingId] = useState("pine"),
    [budget, setBudget] = useState("220");
  const dialog = useRef(null);
  // PayPal sends buyers back with ?paypal=return|cancel|lab&payment=<id>.
  const paypalReturn = useRef(new URLSearchParams(location.search));
  async function load(who = actor) {
    try {
      const r = await fetch("/api/state", { headers: { "x-demo-actor": who } });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setState(data);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [actor]);
  // Other people act in their own windows; keep this one current while it's visible.
  useEffect(() => {
    const refresh = () =>
      document.visibilityState === "visible" && !modal && !busy && load();
    const timer = setInterval(refresh, 3000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [actor, modal, busy]);
  useEffect(() => {
    const q = paypalReturn.current;
    const result = q.get("paypal");
    if (!state || !result) return;
    paypalReturn.current = new URLSearchParams();
    history.replaceState(
      null,
      "",
      actor === "organizer"
        ? "/"
        : `/?participant=${encodeURIComponent(actor)}`,
    );
    if (result === "lab") {
      setTab("sandbox");
      setNotice(
        "Back from PayPal. Confirm the authorization in the sandbox lab.",
      );
    } else if (result === "cancel")
      setNotice(
        "PayPal checkout cancelled. Nothing was authorized; open the checkout again when you’re ready.",
      );
    else if (result === "return" && q.get("payment"))
      act("complete-approval", {
        paymentId: q.get("payment"),
        version: state.version,
      }).then(
        (ok) =>
          ok &&
          setNotice(
            "PayPal confirmed your sandbox authorization. Your exact share is held, not charged.",
          ),
      );
  }, [state]);
  useEffect(() => {
    // After someone confirms a limit, re-verify the shown options (no model call).
    if (!revOptions || !state) return;
    if (state.status !== "revision_required") return setRevOptions(null);
    if (actor === "organizer" && !modal) suggestOptions(true);
  }, [actor, modal, state?.status, state?.audit.length]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  async function act(endpoint, input = {}, who = actor) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-actor": who },
        body: JSON.stringify(input),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      if (endpoint === "interpret") setInsight(data);
      else setState(data);
      return data;
    } catch (e) {
      setError(e.message);
      await load(who);
      return false;
    } finally {
      setBusy(false);
    }
  }
  // Proposals come from the model or local planner; `recheck` re-verifies shown options without a model call.
  async function suggestOptions(recheck = false) {
    setRevBusy(true);
    setError("");
    try {
      const r = await fetch(
        recheck ? "/api/revision-options/recheck" : "/api/revision-options",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-actor": "organizer",
          },
          body: JSON.stringify(
            recheck ? { batchId: revOptions.batchId } : { notes },
          ),
        },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setRevOptions((prev) =>
        recheck && prev ? { ...prev, options: data.options } : data,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setRevBusy(false);
    }
  }
  async function publishOption(o) {
    if (
      // The server resolves the option by ID; shares and provenance never come from here.
      await act("revise", { optionId: o.id })
    ) {
      setRevOptions(null);
      setNotice(
        "New version published. Each person reviews and approves their own share; no new hold exists until they do.",
      );
    }
  }
  // The organizer asks one person; the request appears in that person's own view.
  async function requestLimit(c, kind) {
    await act(
      "request-limit",
      {
        batchId: revOptions?.batchId,
        participantId: c.participantId,
        kind,
        amountCents: c.amountCents ?? null,
      },
      "organizer",
    );
  }
  async function answerLimit(request, amountCents) {
    if (
      await act(
        "confirm-limit",
        { amountCents, requestId: request.id },
        request.participantId,
      )
    ) {
      setModal(null);
      setNotice(
        "Limit saved. Nothing was charged; you’ll review your new share once the organizer publishes it.",
      );
      await load();
    }
  }
  async function declineLimit(request) {
    if (
      await act(
        "decline-limit",
        { requestId: request.id },
        request.participantId,
      )
    ) {
      setModal(null);
      await load();
    }
  }
  async function review(p, suggestion = null, kind = "approve") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/state", {
        headers: { "x-demo-actor": p.id },
      });
      const own = await r.json();
      if (!r.ok) throw Error(own.error);
      const person = own.participants.find((x) => x.id === p.id);
      setActor(p.id);
      setState(own);
      setBudget(person.budget === null ? "" : String(person.budget / 100));
      setModal({ kind, id: p.id, suggestion });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            planId: state.id,
            provider: state.provider,
            version: state.version,
            status: state.status,
            reservation: state.reservation,
            operations: state.operations,
            consents: state.consents,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "harambee-demo-receipts.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (!state)
    return (
      <main className="loading">
        <Leaf size={32} />
        <h1>Getting everyone together.</h1>
        <p>{error || "Opening your trip…"}</p>
        {error && <button onClick={() => load()}>Try again</button>}
      </main>
    );
  const listing = state.catalog.find((c) => c.id === state.listingId),
    active = state.participants.filter((p) => p.active),
    shareFor = (id) =>
      state.current.shares.find((s) => s.id === id)?.share || 0,
    approved = (id) =>
      state.consents.some(
        (c) => c.participantId === id && c.version === state.version,
      ),
    pays = (id) => state.payments.filter((p) => p.participantId === id),
    heldFor = (id) =>
      pays(id)
        .filter((p) => p.status === "authorized")
        .reduce((s, p) => s + p.amount, 0),
    // A capture that failed leaves the authorization in place until recovery releases it.
    held = state.payments
      .filter((p) => ["authorized", "failed"].includes(p.status))
      .reduce((s, p) => s + p.amount, 0),
    captured = state.payments
      .filter((p) => p.status === "captured" || p.status === "refund_pending")
      .reduce((s, p) => s + p.amount, 0),
    // Approvals only count toward an open or booked plan; a plan awaiting revision has none yet.
    count = ["collecting", "ready", "booking", "confirmed"].includes(
      state.status,
    )
      ? active.filter((p) => approved(p.id)).length
      : 0,
    isOpen = ["collecting", "ready", "revision_required"].includes(
      state.status,
    ),
    // Mirrors the server: a new trip can't replace one with money still held or in motion.
    locked =
      !["collecting", "cancelled", "confirmed"].includes(state.status) ||
      state.payments.some((p) => !["voided", "refunded"].includes(p.status)),
    currentPerson = active.find((p) => p.id === actor),
    isOrganizer = actor === "organizer",
    modalPerson = state.participants.find((p) => p.id === modal?.id),
    departedNames = state.participants
      .filter((p) => !p.active)
      .map((p) => p.name.split(" ")[0])
      .join(" and "),
    myRequests = (state.limitRequests ?? []).filter(
      (r) => r.participantId === actor && r.status === "pending",
    ),
    firstOf = (id) =>
      state.participants.find((p) => p.id === id)?.name.split(" ")[0],
    // Plain-language account of a stopped booking, so nobody has to read an operations log.
    // Plain-language account of a stopped booking or cancellation, from the reason the server
    // recorded and each payment's actual status, so nobody has to read an operations log.
    stopped = (() => {
      if (state.status !== "recovery_pending") return null;
      const by = (statuses) =>
        state.payments.filter((p) => statuses.includes(p.status));
      const names = (ps) =>
        [...new Set(ps.map((p) => firstOf(p.participantId)))].join(" and ");
      const total = (ps) => usd(ps.reduce((n, p) => n + p.amount, 0));
      const stop = state.stop ?? {};
      const who = stop.participantId ? firstOf(stop.participantId) : "One";
      const cause =
        {
          capture_declined: `${who}’s payment didn’t go through.`,
          capture_unknown:
            "PayPal didn’t confirm one payment in time; Harambee checks with PayPal before doing anything else.",
          reservation_failed: "The cabin couldn’t be reserved.",
          reservation_unknown:
            "The cabin’s reply timed out; Harambee checks the reservation before deciding.",
          lease_expired:
            "The cabin hold ran out before every payment was confirmed.",
          cancelled: "The organizer cancelled the trip.",
          expired: "The collection deadline passed.",
        }[stop.reason] ?? "Something stopped the booking.";
      const toReturn = by(["captured"]),
        returning = by(["refund_pending"]),
        refundFailed = by(["refund_failed"]),
        checking = by([
          "capture_unknown",
          "void_unknown",
          "void_pending",
          "authorize_unknown",
          "unknown",
        ]);
      const parts = [cause, "Nothing more will be collected."];
      if (toReturn.length)
        parts.push(`${names(toReturn)}’s ${total(toReturn)} will be returned.`);
      if (returning.length)
        parts.push(
          `${names(returning)}’s ${total(returning)} is being returned; PayPal is still processing it.`,
        );
      if (refundFailed.length)
        parts.push(
          `PayPal reports ${names(refundFailed)}’s refund of ${total(refundFailed)} failed. That money is still captured; nothing was retried automatically.`,
        );
      parts.push(
        checking.length
          ? `${names(checking)}’s payment is still being confirmed with PayPal.`
          : toReturn.length || returning.length || refundFailed.length
            ? "Every other hold will be released, never charged."
            : "Every hold will be released; nobody was charged.",
      );
      parts.push("Nobody is charged twice.");
      return {
        title: ["cancelled", "expired"].includes(stop.reason)
          ? "Closing the trip."
          : "Booking stopped.",
        text: parts.join(" "),
        refundFailed: refundFailed.length > 0,
        onlyRefunds:
          returning.length > 0 &&
          state.payments.every((p) =>
            ["refund_pending", "refunded", "voided", "abandoned"].includes(
              p.status,
            ),
          ),
      };
    })();
  const statusText = {
    collecting: "Getting the group together",
    ready: "Everyone’s in. Let’s go.",
    revision_required: "A new plan starts here.",
    booking: "Booking in progress",
    confirmed: "See you in the Catskills.",
    recovery_pending: stopped?.title ?? "Booking stopped.",
    cancelled: "All settled. No booking.",
  }[state.status];
  return (
    <>
      <div className="demo-strip">
        <span className="dot" />
        INTERACTIVE DEMO{" "}
        <span className="strip-detail">
          Local cabin inventory ·{" "}
          {state.provider === "paypal-sandbox"
            ? "PayPal sandbox group"
            : "Simulated payments"}{" "}
          · No real money
        </span>
        <span className="demo-right">Built for going together</span>
      </div>
      <header className="header">
        <a className="brand" href="/" aria-label="Harambee home">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          harambee<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main">
          <button className="nav-active" onClick={() => setTab("board")}>
            Your trips
          </button>
          <button onClick={() => setModal({ kind: "how" })}>
            How it works
          </button>
        </nav>
        <label className="identity">
          <span>Demo view</span>
          <select
            aria-label="Switch demo identity"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          >
            <option value="organizer">Organizer</option>
            {state.participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name.split(" ")[0]}
                {!p.active ? " (left)" : ""}
              </option>
            ))}
          </select>
          <span className="avatar mini">{currentPerson?.initials || "YO"}</span>
        </label>
      </header>
      <main className="shell">
        <div className="breadcrumb">
          <span>Your trips</span>
          <span>/</span>
          <span>Catskills weekend</span>
          <button
            className="text-button"
            onClick={() => {
              setActor("organizer");
              setModal({ kind: "create" });
            }}
          >
            <Plus size={15} /> New trip
          </button>
        </div>
        <div className="page-title">
          <div>
            <div className="eyebrow">GOOD COMPANY. GREAT PLANS.</div>
            <h1>
              {state.title}
              <span className="title-period">.</span>
            </h1>
            <p>A shared escape, without one person fronting the cost.</p>
          </div>
          <div className="group-stack">
            {active.slice(0, 4).map((p, i) => (
              <span className={`avatar color-${i}`} key={p.id}>
                {p.initials}
              </span>
            ))}
            <span className="group-label">{active.length} going together</span>
          </div>
        </div>
        <section className="session-panel">
          {isOrganizer ? (
            <details className="demo-controls-panel">
              <summary>Demo controls</summary>
              <p>
                Open each friend’s view in a new tab. These are demo links, not
                sign-in; anyone with local access can switch roles.
              </p>
              <div className="session-links">
                {active.map((p) => (
                  <a
                    key={p.id}
                    href={`/?participant=${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open {p.name.split(" ")[0]}’s view
                  </a>
                ))}
              </div>
              {state.payments.length === 0 && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act("provider", {
                      provider:
                        state.provider === "paypal-sandbox"
                          ? "simulated"
                          : "paypal-sandbox",
                    })
                  }
                >
                  {state.provider === "paypal-sandbox"
                    ? "Use simulator"
                    : "Use PayPal sandbox for this group"}
                </button>
              )}
            </details>
          ) : (
            <p className="viewing-as">
              Viewing as {currentPerson?.name || actor} · demo link, not sign-in
            </p>
          )}
          {!isOrganizer &&
            state.provider === "paypal-sandbox" &&
            state.payments
              .filter(
                (p) =>
                  p.participantId === actor &&
                  p.sandboxSessionId &&
                  !["voided", "refunded", "captured", "authorized"].includes(
                    p.status,
                  ),
              )
              .map((p) => (
                <div key={p.id}>
                  <p>
                    Version {p.version} · additional {usd(p.amount)} ·{" "}
                    {label(p.status)}
                  </p>
                  {p.approvalUrl && (
                    <a href={p.approvalUrl}>
                      Approve this exact amount in PayPal sandbox
                    </a>
                  )}
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      act("complete-approval", {
                        paymentId: p.id,
                        version: state.version,
                      })
                    }
                  >
                    I approved in PayPal — confirm authorization
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      act("reconcile-payment", { paymentId: p.id })
                    }
                  >
                    Reconcile payment
                  </button>
                </div>
              ))}
        </section>
        <div className="layout">
          <div className="main-column">
            {!isOrganizer &&
              currentPerson &&
              myRequests.map((r) => (
                <LimitRequest
                  key={r.id}
                  request={r}
                  person={currentPerson}
                  departed={departedNames}
                  busy={busy}
                  onConfirm={(cents) => answerLimit(r, cents)}
                  onDecline={() => declineLimit(r)}
                  onUpdateBudget={() => review(currentPerson, null, "budget")}
                />
              ))}
            <section className="trip-hero">
              <div className="hero-art">
                <Cabin />
              </div>
              <div className="hero-content">
                <span className="pill hero-pill">
                  <MapPin size={12} /> CATSKILLS, NEW YORK
                </span>
                <h2>
                  A slower kind
                  <br />
                  of weekend.
                </h2>
                <div className="hero-details">
                  <span>
                    <CalendarDays size={15} />
                    {state.dates}
                  </span>
                  <span>
                    <Mountain size={15} />2 nights, all yours
                  </span>
                </div>
              </div>
              <span className="fixture-label">Illustrated fixture cabin</span>
            </section>
            <nav className="tabs" aria-label="Trip sections">
              {[
                ["board", "Commitment board", Users],
                ["notes", "Planning notes", Sparkles],
                ["ledger", "Activity & receipts", ReceiptText],
              ].map(([id, text, Icon]) => (
                <button
                  key={id}
                  className={tab === id ? "selected" : ""}
                  aria-current={tab === id ? "page" : undefined}
                  onClick={() => setTab(id)}
                >
                  <Icon size={16} />
                  {text}
                  {id === "board" && <span>{active.length}</span>}
                </button>
              ))}
            </nav>
            {error && (
              <div className="alert error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {notice && (
              <div className="alert" role="status">
                {notice}
              </div>
            )}
            {tab === "board" && (
              <>
                <div className="section-heading">
                  <div>
                    <h2>Everyone has a place.</h2>
                    <p>Clear shares. Individual approvals. One shared plan.</p>
                  </div>
                  <span className="version">PLAN V{state.version}</span>
                </div>
                {state.status === "revision_required" && (
                  <div className="revision-banner">
                    <Sparkles size={21} />
                    <div>
                      <strong>The group changed. The plan can, too.</strong>
                      <p>
                        {isOrganizer
                          ? "Choose a new plan below. Everyone reviews and approves their own new share."
                          : "The organizer is choosing a new plan. You’ll review your new share before anything changes."}
                      </p>
                    </div>
                  </div>
                )}
                {stopped && (
                  <div className="alert error stopped" role="status">
                    <AlertCircle size={18} />
                    <span>
                      <strong>{stopped.title}</strong> {stopped.text}
                    </span>
                  </div>
                )}
                {state.status === "revision_required" && isOrganizer && (
                  <RevisionOptions
                    data={revOptions}
                    busy={busy || revBusy}
                    noteLines={notes.split("\n").filter((l) => l.trim()).length}
                    participants={active}
                    onSuggest={() => suggestOptions()}
                    onPublish={publishOption}
                    onEditNotes={() => setTab("notes")}
                    requests={state.limitRequests ?? []}
                    onRequest={requestLimit}
                    onCancelTrip={() => setModal({ kind: "cancel" })}
                    onDemoAnswer={(request) =>
                      setModal({
                        kind: "limit",
                        id: request.participantId,
                        request,
                      })
                    }
                  />
                )}
                <section
                  className="people-card"
                  aria-label="Participant commitments"
                >
                  <div className="table-head">
                    <span>THE GROUP</span>
                    <span>YOUR SHARE</span>
                    <span>COMMITMENT</span>
                    <span />
                  </div>
                  {state.participants.map((p, i) => {
                    const payment = pays(p.id),
                      hold = payment
                        .filter((x) => x.status === "authorized")
                        .reduce((s, x) => s + x.amount, 0),
                      charge = payment
                        .filter((x) =>
                          ["captured", "refund_pending"].includes(x.status),
                        )
                        .reduce((s, x) => s + x.amount, 0);
                    return (
                      <div
                        className={`person-row ${!p.active ? "departed" : ""}`}
                        key={p.id}
                      >
                        <div className="person-name">
                          <span className={`avatar color-${i % 4}`}>
                            {p.initials}
                          </span>
                          <div>
                            <strong>{p.name}</strong>
                            <span>
                              {!p.active
                                ? "Left the trip"
                                : p.id === actor
                                  ? "You"
                                  : i === 0
                                    ? "Bringing the good playlist"
                                    : i === 1
                                      ? "On coffee duty"
                                      : i === 2
                                        ? "Trail finder"
                                        : "Weekend wanderer"}
                            </span>
                          </div>
                        </div>
                        <div className="person-share">
                          <strong>
                            {p.active ? usd(shareFor(p.id)) : "—"}
                          </strong>
                          {p.active && state.version > 1 && (
                            <small>
                              {usd(
                                state.versions
                                  .at(-2)
                                  ?.shares.find((s) => s.id === p.id)?.share ||
                                  0,
                              )}{" "}
                              before
                            </small>
                          )}
                        </div>
                        <div className="commitment">
                          {!p.active ? (
                            <span className="status neutral">Hold voided</span>
                          ) : state.status === "confirmed" ? (
                            <span className="status green">
                              <CheckCheck size={13} />
                              Paid {usd(charge)}
                            </span>
                          ) : state.status === "cancelled" ? (
                            <span className="status neutral">Settled</span>
                          ) : state.status === "recovery_pending" ? (
                            <span className="status neutral">
                              {payment.some((x) => x.status === "unknown")
                                ? "Checking with PayPal"
                                : charge
                                  ? `${usd(charge)} to return`
                                  : payment.some((x) => x.status === "failed")
                                    ? "Payment failed · hold to release"
                                    : payment.every((x) =>
                                          [
                                            "voided",
                                            "refunded",
                                            "abandoned",
                                          ].includes(x.status),
                                        )
                                      ? "Settled · nothing owed"
                                      : "Hold to release"}
                            </span>
                          ) : approved(p.id) ? (
                            <>
                              <span className="status green">
                                <Check size={13} />
                                Approved v{state.version}
                              </span>
                              <small>{usd(hold)} held · not charged</small>
                            </>
                          ) : (
                            <>
                              <span className="status neutral">
                                Awaiting approval
                              </span>
                              {hold > 0 && (
                                <small>{usd(hold)} already held</small>
                              )}
                            </>
                          )}
                        </div>
                        <div className="row-action">
                          {p.active &&
                            isOpen &&
                            state.status !== "revision_required" &&
                            !approved(p.id) &&
                            (isOrganizer || actor === p.id) && (
                              <button
                                className="review-button"
                                disabled={busy}
                                onClick={() => review(p)}
                              >
                                Review <ArrowUpRight size={13} />
                              </button>
                            )}
                          {p.active && isOpen && (
                            <button
                              className="icon-button leave"
                              title={`Withdraw ${p.name}`}
                              aria-label={`Withdraw ${p.name}`}
                              disabled={
                                busy || !(isOrganizer || actor === p.id)
                              }
                              onClick={() =>
                                setModal({ kind: "withdraw", id: p.id })
                              }
                            >
                              <LogOut size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="table-foot">
                    <ShieldCheck size={16} />
                    <span>
                      Nothing is charged until everyone agrees and the booking
                      begins.
                    </span>
                  </div>
                </section>
                <div className="below-board">
                  <div className="split-note">
                    <div className="round-icon">
                      <Settings2 size={18} />
                    </div>
                    <div>
                      <h3>A fair split, with boundaries.</h3>
                      <p>
                        Equal shares, adjusted only to respect confirmed
                        budgets. Every cent is accounted for.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setModal({ kind: "allocation" })}
                      >
                        View allocation details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="budget-note">
                    <LockKeyhole size={17} />
                    <div>
                      <h3>Your budget stays yours.</h3>
                      <p>
                        Nobody sees your budget. If it caps your share, your
                        share will equal it, and everyone sees shares.
                      </p>
                    </div>
                  </div>
                </div>
                {isOrganizer && isOpen && (
                  <details className="demo-controls">
                    <summary>
                      Demo scenarios <span>Try a twist in the trip</span>
                    </summary>
                    <div>
                      <label>
                        Booking scenario
                        <select
                          aria-label="Booking demo scenario"
                          value={fault}
                          onChange={(e) => setFault(e.target.value)}
                        >
                          <option value="none">Successful booking</option>
                          <option
                            disabled={state.provider === "paypal-sandbox"}
                            value="capture_failure"
                          >
                            Second capture fails
                          </option>
                          <option
                            disabled={state.provider === "paypal-sandbox"}
                            value="capture_timeout"
                          >
                            Capture response times out
                          </option>
                          <option value="reservation_failure">
                            Merchant commit fails
                          </option>
                          <option
                            disabled={state.provider === "paypal-sandbox"}
                            value="refund_pending"
                          >
                            Refund needs a second recovery
                          </option>
                          <option
                            disabled={state.provider === "paypal-sandbox"}
                            value="lease_expiry"
                          >
                            Inventory lease expires
                          </option>
                          <option
                            disabled={state.provider === "paypal-sandbox"}
                            value="commit_timeout"
                          >
                            Merchant commit times out
                          </option>
                        </select>
                      </label>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => act("expire")}
                      >
                        Simulate deadline expiry
                      </button>
                    </div>
                    <p>
                      These are deliberate simulator faults, not live PayPal
                      events.
                    </p>
                  </details>
                )}
              </>
            )}
            {tab === "notes" && (
              <section className="notes-panel">
                <div className="section-heading">
                  <div>
                    <h2>From “we should go” to a plan.</h2>
                    <p>
                      Turn consented planning notes into reviewable preferences.
                    </p>
                  </div>
                  <Sparkles size={24} />
                </div>
                <label className="field">
                  Planning notes
                  <textarea
                    rows={7}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={8000}
                  />
                </label>
                {state.status === "revision_required" ? (
                  // One chat reader at a time: during a revision, the options read these notes.
                  <div className="notes-actions">
                    <span>
                      “Suggest options” reads this chat. Edit it here, then go
                      back to choose a new plan.
                    </span>
                    <button className="primary" onClick={() => setTab("board")}>
                      Back to the new plan <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="notes-actions">
                    <span>
                      {state.aiAvailable
                        ? "AI model connected · source-checked output"
                        : "Local parser · no model key configured"}
                    </span>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => act("interpret", { text: notes })}
                    >
                      <Sparkles size={16} />
                      {busy ? "Reading the room…" : "Find the preferences"}
                    </button>
                  </div>
                )}
                {insight && state.status !== "revision_required" && (
                  <div className="insights">
                    <div className="insight-intro">
                      <span className="eyebrow">
                        {insight.provider === "openai"
                          ? "AI DRAFT"
                          : "LOCAL PARSER DRAFT"}
                      </span>
                      <h3>{insight.summary}</h3>
                      <p>
                        {insight.fallbackReason ||
                          "Suggestions never change budgets, shares, or approvals automatically."}
                      </p>
                    </div>
                    {insight.constraints.map((c, i) => (
                      <article className="constraint" key={i}>
                        <div>
                          <strong>{c.person}</strong>
                          <span
                            className={`status ${c.needsReview ? "amber" : "green"}`}
                          >
                            {c.needsReview
                              ? "Needs clarification"
                              : "Ready to review"}
                          </span>
                        </div>
                        <p>{c.preference}</p>
                        {c.groundingWarning && (
                          <p role="status">{c.groundingWarning}</p>
                        )}
                        <blockquote>
                          “{c.source}” <span>Line {c.line}</span>
                        </blockquote>
                        {c.budgetCents !== null && (
                          <small>
                            Suggested ceiling: {usd(c.budgetCents)} · not saved
                            or approved
                          </small>
                        )}
                        {active
                          .filter(
                            (p) =>
                              p.name.toLowerCase() === c.person.toLowerCase() ||
                              p.name.split(" ")[0].toLowerCase() ===
                                c.person.toLowerCase(),
                          )
                          .map((p) => (
                            <button
                              className="secondary"
                              key={p.id}
                              onClick={() => review(p, c)}
                            >
                              Review suggestion as {p.name.split(" ")[0]}
                            </button>
                          ))}
                        <label className="field">
                          Review or clarify with a participant
                          <select
                            value=""
                            onChange={(e) => {
                              const p = active.find(
                                (p) => p.id === e.target.value,
                              );
                              if (p) review(p, c);
                            }}
                          >
                            <option value="">Choose participant…</option>
                            {active.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))}
                    {insight.provider === "openai" && (
                      <small>
                        Model: {insight.model} · {insight.latencyMs} ms ·{" "}
                        {insight.usage?.total_tokens || "—"} tokens. Provider
                        cost is not calculated.
                      </small>
                    )}
                  </div>
                )}
              </section>
            )}
            {tab === "sandbox" && <SandboxLab />}
            {tab === "ledger" && (
              <section className="ledger-panel">
                <div className="section-heading">
                  <div>
                    <h2>The whole story, on record.</h2>
                    <p>
                      Every agreement and money movement, labeled by provider.
                    </p>
                  </div>
                  <button className="secondary" onClick={download}>
                    <Download size={15} />
                    Export
                  </button>
                </div>
                {state.reservation && (
                  <div className="reservation">
                    <Mountain size={22} />
                    <div>
                      <strong>
                        Local merchant reservation ·{" "}
                        {label(state.reservation.status)}
                      </strong>
                      <p>{state.reservation.id}</p>
                    </div>
                  </div>
                )}
                <div className="timeline">
                  {[...state.audit].reverse().map((e, i) => (
                    <article key={e.id}>
                      <span
                        className={`event-dot ${i === 0 ? "latest" : ""}`}
                      />
                      <time>
                        {new Date(e.at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                      <p>{e.text}</p>
                    </article>
                  ))}
                </div>
                <h3>Simulated payment operations</h3>
                {state.operations.length === 0 ? (
                  <p className="empty">
                    Your first approval starts the paper trail.
                  </p>
                ) : (
                  <div className="operations">
                    {[...state.operations].reverse().map((op) => (
                      <div key={op.id}>
                        <span className="op-type">{label(op.type)}</span>
                        <span>
                          {
                            state.participants
                              .find((p) => p.id === op.participantId)
                              ?.name.split(" ")[0]
                          }
                        </span>
                        <strong>{usd(op.amount)}</strong>
                        <span
                          className={`status ${op.status === "confirmed" ? "green" : "amber"}`}
                        >
                          {op.status}
                        </span>
                        <small title={op.key}>
                          {op.providerId || `SIM-OP-${op.id.slice(0, 8)}`} · v
                          {op.version} · attempt {op.attempts}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          <aside className="sidebar">
            <section className="booking-card">
              <div className="eyebrow">YOUR SHARED ESCAPE</div>
              <div className="listing-heading">
                <h2>{listing.name}</h2>
                <Leaf size={22} />
              </div>
              <p className="location">
                <MapPin size={14} />
                {listing.location}
              </p>
              <div className="booking-meta">
                <span>
                  <CalendarDays size={15} />
                  {state.dates}
                </span>
                <span>
                  <Users size={15} />
                  {active.length} friends · 2 nights
                </span>
              </div>
              <div className="price-row">
                <span>The whole stay</span>
                <strong>
                  {usd(state.current.total)}
                  <small> USD</small>
                </strong>
              </div>
              <p className="price-note">
                Fixed demo price. No added service fee.
              </p>
              <div className="funding">
                <div>
                  <span>
                    {state.status === "confirmed"
                      ? "Payment complete"
                      : "Group commitment"}
                  </span>
                  <strong>
                    {state.status === "revision_required"
                      ? "Waiting for a new plan"
                      : state.status === "cancelled"
                        ? "Closed"
                        : state.status === "recovery_pending"
                          ? "Booking stopped"
                          : `${count}/${active.length} approved`}
                  </strong>
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label="Participants approved"
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={active.length}
                >
                  {active.map((p, i) => (
                    <span className={i < count ? "filled" : ""} key={p.id} />
                  ))}
                </div>
                <div className="funding-amount">
                  <strong>
                    {usd(state.status === "confirmed" ? captured : held)}
                  </strong>
                  <span>
                    {state.status === "confirmed"
                      ? state.provider === "paypal-sandbox"
                        ? "charged in sandbox"
                        : "charged in simulation"
                      : "held, not charged"}
                  </span>
                </div>
                <dl className="funding-breakdown">
                  <div>
                    <dt>Held, not charged</dt>
                    <dd>{usd(held)}</dd>
                  </div>
                  <div>
                    <dt>Captured, not returned</dt>
                    <dd>{usd(captured)}</dd>
                  </div>
                  <div>
                    <dt>Refund pending (of captured)</dt>
                    <dd>
                      {usd(
                        state.payments
                          .filter((p) => p.status === "refund_pending")
                          .reduce((n, p) => n + p.amount, 0),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Returned</dt>
                    <dd>
                      {usd(
                        state.payments
                          .filter((p) => p.status === "refunded")
                          .reduce((n, p) => n + p.amount, 0),
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div
                className={`next-step ${state.status === "confirmed" ? "success" : ""}`}
              >
                <span className="step-icon">
                  {state.status === "confirmed" ? (
                    <CheckCircle2 size={18} />
                  ) : state.status === "recovery_pending" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <Clock3 size={18} />
                  )}
                </span>
                <div>
                  <strong>{statusText}</strong>
                  <p>
                    {state.status === "ready"
                      ? "All shares are approved and held. The organizer can now book."
                      : state.status === "confirmed"
                        ? "Your local fixture reservation is confirmed. View each person’s receipt below."
                        : state.status === "recovery_pending"
                          ? "Return what was taken and release every hold. Harambee checks each payment with the provider first."
                          : state.status === "cancelled"
                            ? "Collection is closed. Released holds and refunds are recorded in activity."
                            : state.status === "revision_required"
                              ? myRequests.length
                                ? "Your organizer asked you a question about your limit."
                                : "The organizer needs to publish new shares before anyone approves."
                              : `${active.length - count} ${active.length - count === 1 ? "friend still needs" : "friends still need"} to review and approve this version.`}
                  </p>
                </div>
              </div>
              {state.status === "confirmed" ? (
                <button
                  className="primary full"
                  onClick={() => setTab("ledger")}
                >
                  View booking & receipts <ArrowRight size={17} />
                </button>
              ) : state.status === "recovery_pending" ||
                state.status === "booking" ? (
                <>
                  <button
                    className="primary full"
                    disabled={busy || !isOrganizer}
                    onClick={() => act("recover")}
                  >
                    {busy
                      ? "Checking payments…"
                      : stopped?.onlyRefunds
                        ? "Check refund status"
                        : "Return money & release holds"}
                    <RefreshCw size={16} />
                  </button>
                  {stopped?.refundFailed && isOrganizer && (
                    // A failed refund is retried only on purpose, with a new PayPal request.
                    <button
                      className="secondary full"
                      disabled={busy}
                      onClick={() => act("recover", { retryRefunds: true })}
                    >
                      Retry the failed refund
                    </button>
                  )}
                </>
              ) : state.status === "cancelled" ? (
                <>
                  {isOrganizer && (
                    <button
                      className="primary full"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await act(
                            "create",
                            {
                              title: state.title,
                              names: active.map((p) => p.name).join(", "),
                              listingId: state.listingId,
                            },
                            "organizer",
                          )
                        )
                          setNotice(
                            "New round started. Everyone saves a budget and approves again; the last round’s outcome is the first line in Activity.",
                          );
                      }}
                    >
                      Start a new round with the same group{" "}
                      <ArrowRight size={16} />
                    </button>
                  )}
                  <button
                    className="secondary full"
                    onClick={() => {
                      setActor("organizer");
                      setModal({ kind: "reset" });
                    }}
                  >
                    Restart the demo
                  </button>
                </>
              ) : state.status === "revision_required" &&
                !isOrganizer &&
                myRequests.length ? (
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={() =>
                    document
                      .getElementById("limit-request")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Answer your organizer’s question <ArrowRight size={16} />
                </button>
              ) : state.status === "revision_required" ? (
                <button
                  className="primary full"
                  disabled={busy || !isOrganizer}
                  onClick={() =>
                    document
                      .getElementById("revision-options")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  {isOrganizer
                    ? "Choose a new plan"
                    : "Waiting for the organizer’s new plan"}{" "}
                  <ArrowRight size={16} />
                </button>
              ) : currentPerson && !approved(actor) ? (
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={() => review(currentPerson)}
                >
                  Review my {usd(shareFor(actor))} share{" "}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="primary full"
                  disabled={busy || state.status !== "ready" || !isOrganizer}
                  onClick={() => setModal({ kind: "book" })}
                >
                  Book our weekend <ArrowRight size={17} />
                </button>
              )}
              {state.status === "revision_required" &&
                !isOrganizer &&
                currentPerson && (
                  <button
                    className="secondary full"
                    disabled={busy}
                    onClick={() => review(currentPerson, null, "budget")}
                  >
                    Update my budget
                  </button>
                )}
              {!isOrganizer && (
                <button
                  className="text-button switch-back"
                  onClick={() => setActor("organizer")}
                >
                  Back to organizer view <ArrowRight size={13} />
                </button>
              )}
              <p className="secure-note">
                <ShieldCheck size={13} />
                {state.provider === "paypal-sandbox"
                  ? "PayPal sandbox authorization & capture"
                  : "Simulated authorization & capture"}
              </p>
            </section>
            <section className="together-note">
              <span className="small-leaf">
                <Leaf size={20} />
              </span>
              <h3>
                Harambee means
                <br />
                “all pull together.”
              </h3>
              <p>
                Because the best trips start with everyone on the same page.
              </p>
            </section>
            {isOrganizer && (
              <button
                className="reset-link"
                onClick={() => setModal({ kind: "reset" })}
              >
                <RefreshCw size={13} />
                Start the demo fresh
              </button>
            )}
            {isOrganizer && (
              <button className="reset-link" onClick={() => setTab("sandbox")}>
                <ExternalLink size={13} />
                Open PayPal sandbox lab
              </button>
            )}
          </aside>
        </div>
        <footer>
          <span className="footer-brand">harambee.</span>
          <span>Less chasing. More going.</span>
          <span>USD · Local demo · No real bookings</span>
        </footer>
      </main>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClose={() => setModal(null)}
        aria-label={
          modal?.kind === "approve"
            ? "Review and authorize your share"
            : "Trip action"
        }
      >
        <button
          className="dialog-close icon-button"
          onClick={() => setModal(null)}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {modal?.kind === "approve" && modalPerson && (
          <>
            <span className="eyebrow">YOUR CHOICE, YOUR COMMITMENT</span>
            {!isOpen && (
              <p role="status">
                This trip is closed. You can inspect this note and saved
                ceiling, but budgets and approvals cannot change.
              </p>
            )}
            <h2>You’re in, {modalPerson.name.split(" ")[0]}?</h2>
            <p>
              Review version {state.version} for {listing.name}. This approval
              belongs to {modalPerson.name} in the local demo.
            </p>
            {(() => {
              // Compare with what this person approved before and what is still held now.
              const prior = state.versions.find(
                (v) => v.number === state.version - 1,
              );
              const before = prior?.shares.find(
                (s) => s.id === modalPerson.id,
              )?.share;
              const share = shareFor(modalPerson.id);
              const held = heldFor(modalPerson.id);
              if (before === undefined || before === share) return null;
              return (
                <p className="change-why">
                  {state.current.reason}.{" "}
                  {prior.listingId !== state.listingId
                    ? `Your earlier hold is released, and you approve ${usd(share)} for ${listing.name}.`
                    : held > 0
                      ? `Your share changes from ${usd(before)} to ${usd(share)}. You’ll approve only the extra ${usd(share - held)}.`
                      : `Your share changes from ${usd(before)} to ${usd(share)}. Your earlier hold is released, and you approve the new amount.`}
                </p>
              );
            })()}
            {(() => {
              const share = shareFor(modalPerson.id);
              const held = heldFor(modalPerson.id);
              const extra = Math.max(0, share - held);
              const kind =
                state.provider === "paypal-sandbox" ? "sandbox" : "simulated";
              return (
                <div className="consent-amount">
                  <span>{held > 0 ? "Approve now" : "Your exact share"}</span>
                  <strong>
                    {held > 0
                      ? extra
                        ? `+${usd(extra)}`
                        : "No new hold"
                      : usd(share)}
                  </strong>
                  <small>
                    {held > 0
                      ? `New share ${usd(share)} · ${usd(held)} already held · ${kind} hold, not a charge`
                      : `A ${kind} hold, not a charge`}
                  </small>
                </div>
              );
            })()}
            <label className="field">
              Your private budget ceiling (USD)
              <input
                type="number"
                min="1"
                max="100000"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
            <p className="terms">
              <ShieldCheck size={17} />I approve this exact version and personal
              share. Booking starts only after everyone approves. Fixture
              cancellation: full refund before check-in.
            </p>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            {modal.suggestion && (
              <div className="suggestion-review">
                <strong>Review note suggestion</strong>
                <p>“{modal.suggestion.source}”</p>
                <p>
                  {modal.suggestion.needsReview
                    ? "Clarification required. Confirm directly with this participant before saving."
                    : "This is a draft, not consent."}
                </p>
                {modal.suggestion.budgetCents !== null && (
                  <button
                    className="secondary"
                    onClick={() =>
                      setBudget(String(modal.suggestion.budgetCents / 100))
                    }
                  >
                    Use suggested ceiling in this field
                  </button>
                )}
              </div>
            )}
            <p className="terms">
              Split rule: equal shares capped by saved budgets; remaining cents
              follow roster order. Shares may reveal something about ceilings
              even though raw budgets are private.
            </p>
            <button
              className="secondary full"
              disabled={busy || !isOpen || !budget || actor !== modalPerson.id}
              onClick={async () => {
                if (
                  await act(
                    "budget",
                    { amount: Math.round(Number(budget) * 100) },
                    modalPerson.id,
                  )
                )
                  setNotice(
                    "Budget saved. No share was approved and no payment was authorized.",
                  );
              }}
            >
              Save budget only
            </button>
            {notice && <p role="status">{notice}</p>}
            <p className="secure-note">
              Saved ceiling:{" "}
              {modalPerson.budget == null
                ? "not yet set"
                : usd(modalPerson.budget)}
              . Save edits before approving. A lower ceiling may require a
              revised plan.
            </p>
            {state.status !== "revision_required" && (
              <button
                className="primary full"
                disabled={
                  busy ||
                  !isOpen ||
                  actor !== modalPerson.id ||
                  modalPerson.budget == null ||
                  Math.round(Number(budget) * 100) !== modalPerson.budget ||
                  modalPerson.budget < shareFor(modalPerson.id) ||
                  state.status === "revision_required"
                }
                onClick={async () => {
                  const next = await act(
                    "approve",
                    { version: state.version },
                    modalPerson.id,
                  );
                  if (next) {
                    const checkout = next.payments?.findLast(
                      (p) =>
                        p.participantId === modalPerson.id && p.approvalUrl,
                    );
                    if (
                      next.provider === "paypal-sandbox" &&
                      checkout?.status === "approval_required"
                    )
                      return location.assign(checkout.approvalUrl);
                    setModal(null);
                    setNotice(
                      state.provider === "paypal-sandbox"
                        ? "Consent recorded. Complete your PayPal sandbox checkout below, then confirm the authorization."
                        : "Your agreement and simulated hold are recorded. Nothing has been charged.",
                    );
                  }
                }}
              >
                {busy
                  ? "Recording your approval…"
                  : state.provider === "paypal-sandbox"
                    ? `Agree & open sandbox checkout for ${usd(Math.max(0, shareFor(modalPerson.id) - heldFor(modalPerson.id)) || shareFor(modalPerson.id))}`
                    : "Agree & authorize simulated hold"}
                <Check size={17} />
              </button>
            )}
            <p className="secure-note">
              {state.provider === "paypal-sandbox"
                ? "Sandbox buyers approve their own exact additional amount in PayPal. No real money."
                : "No PayPal checkout is called in simulator mode."}
            </p>
          </>
        )}
        {modal?.kind === "budget" && modalPerson && (
          <>
            <span className="eyebrow">YOUR PRIVATE BUDGET</span>
            <h2>Change your budget, {modalPerson.name.split(" ")[0]}?</h2>
            <p>
              Only you and the planner use this number. The organizer doesn’t
              see it, though if it caps your share, your share will equal it.
              Nothing is approved or charged; you’ll review your new share once
              the organizer publishes a new plan.
            </p>
            <label className="field">
              Your private budget ceiling (USD)
              <input
                type="number"
                min="1"
                max="100000"
                step="0.01"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  setModal({ ...modal, saved: false });
                }}
              />
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary full"
              disabled={busy || !isOpen || !budget || actor !== modalPerson.id}
              onClick={async () => {
                if (
                  await act(
                    "budget",
                    { amount: Math.round(Number(budget) * 100) },
                    modalPerson.id,
                  )
                )
                  setModal({ ...modal, saved: true });
              }}
            >
              Save my budget
            </button>
            {modal.saved && (
              <p role="status">
                Saved. Your organizer will publish new shares that fit. You can
                change it again until then.
              </p>
            )}
            <p className="secure-note">
              Saved ceiling:{" "}
              {modalPerson.budget == null
                ? "not yet set"
                : usd(modalPerson.budget)}
            </p>
          </>
        )}
        {modal?.kind === "cancel" && (
          <>
            <span className="eyebrow">SOMETIMES IT’S NOT THE WEEKEND</span>
            <h2>Cancel this trip?</h2>
            <p>
              Every hold is released through{" "}
              {state.provider === "paypal-sandbox"
                ? "PayPal sandbox"
                : "the simulator"}
              , nothing is charged, and the plan closes. You can start a new
              round with the same group afterwards.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={async () => {
                if (await act("cancel")) setModal(null);
              }}
            >
              Cancel trip & release every hold
            </button>
          </>
        )}
        {modal?.kind === "withdraw" && (
          <>
            <span className="eyebrow">PLANS CHANGE. THAT’S OKAY.</span>
            <h2>Withdraw {modalPerson?.name.split(" ")[0]}?</h2>
            <p>
              Their unused holds will be released through the selected provider.
              The organizer will publish a new version and every remaining
              person must agree again.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={async () => {
                if (await act("withdraw", { participantId: modal.id })) {
                  setModal(null);
                  if (actor === modal.id) setActor("organizer");
                }
              }}
            >
              Confirm withdrawal <LogOut size={17} />
            </button>
          </>
        )}
        {modal?.kind === "book" && (
          <>
            <span className="eyebrow">ONE LAST LOOK</span>
            <h2>Let’s make it a weekend.</h2>
            <p>
              Capture {usd(state.current.total)} across {active.length}{" "}
              participants for version {state.version}, then commit the local
              merchant’s reservation.
            </p>
            <div className="alert">
              <ShieldCheck size={20} />
              <span>
                {state.provider === "paypal-sandbox"
                  ? "This captures sandbox buyer authorizations and commits fixture inventory only."
                  : "This runs entirely in the payment simulator."}{" "}
                {fault !== "none" && `Selected scenario: ${label(fault)}.`}
              </span>
            </div>
            <button
              className="primary full"
              disabled={busy}
              onClick={async () => {
                if (await act("book", { version: state.version, fault })) {
                  setModal(null);
                  setTab("ledger");
                }
              }}
            >
              {state.provider === "paypal-sandbox"
                ? "Confirm sandbox booking"
                : "Confirm simulated booking"}{" "}
              <ArrowRight size={17} />
            </button>
          </>
        )}
        {modal?.kind === "create" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act("create", { title, names, listingId }, "organizer")
              ) {
                setModal(null);
                setTab("board");
              }
            }}
          >
            <span className="eyebrow">MAKE ROOM FOR A GOOD IDEA</span>
            <h2>Your next shared escape.</h2>
            <label className="field">
              Trip name
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
                maxLength={100}
                required
              />
            </label>
            <label className="field">
              Friends (3–8 names, comma separated)
              <textarea
                rows={3}
                value={names}
                onChange={(e) => setNames(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Fixture cabin
              <select
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
              >
                {state.catalog.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name} · {usd(c.total)}
                  </option>
                ))}
              </select>
            </label>
            <p className="terms">
              Fixed dates: November 6–8, 2026. Each person confirms a private
              budget before approval. Starting a new trip replaces the current
              uncommitted demo plan.
            </p>
            {locked && (
              <p className="inline-error" role="status">
                {held > 0 ? `${usd(held)} is held` : "Money is still in motion"}{" "}
                for the current trip. Finish it or start the demo fresh before
                creating another.
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy || locked}>
              Create our trip <Plus size={16} />
            </button>
          </form>
        )}
        {modal?.kind === "reset" && (
          <>
            <span className="eyebrow">A CLEAN SLATE</span>
            <h2>Restart the local demo?</h2>
            <p>
              This clears the current demo’s approvals, payment ledger, and
              booking, then restores the four-person $600 cabin fixture.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={async () => {
                setActor("organizer");
                if (await act("reset", {}, "organizer")) {
                  setModal(null);
                  setFault("none");
                  setTab("board");
                  setInsight(null);
                }
              }}
            >
              Reset demo data <RefreshCw size={17} />
            </button>
          </>
        )}
        {modal?.kind === "limit" && modalPerson && (
          <LimitRequest
            request={modal.request}
            person={modalPerson}
            departed={departedNames}
            busy={busy}
            demo
            onConfirm={(cents) => answerLimit(modal.request, cents)}
            onDecline={() => declineLimit(modal.request)}
          />
        )}
        {modal?.kind === "allocation" && (
          <>
            <span className="eyebrow">TRANSPARENT BY DESIGN</span>
            <h2>Every cent has a place.</h2>
            <p>{state.current.rule}</p>
            {state.status === "revision_required" && (
              <p role="status">
                A new plan is being chosen. These are version {state.version}’s
                shares, from before {departedNames || "the change"}.
              </p>
            )}
            <div className="allocation">
              {state.current.shares.map((s) => (
                <div key={s.id}>
                  <span>
                    {state.participants.find((p) => p.id === s.id)?.name}
                  </span>
                  <strong>{usd(s.share)}</strong>
                </div>
              ))}
              <div>
                <strong>Total, exactly</strong>
                <strong>{usd(state.current.total)}</strong>
              </div>
            </div>
            <p>
              Changing a roster or cabin creates a new immutable version. Prior
              agreement never approves an increase.
            </p>
            {isOrganizer && isOpen && state.status !== "revision_required" && (
              <button
                className="secondary full"
                disabled={busy}
                onClick={async () => {
                  if (
                    await act("revise", {
                      listingId: state.listingId === "pine" ? "creek" : "pine",
                    })
                  )
                    setModal(null);
                }}
              >
                Try{" "}
                {state.listingId === "pine"
                  ? "the $480 Creekside cabin"
                  : "the $600 Pine & Still cabin"}
              </button>
            )}
          </>
        )}
        {modal?.kind === "how" && (
          <>
            <span className="eyebrow">GO TOGETHER, WITH CONFIDENCE</span>
            <h2>
              A little agreement.
              <br />A great escape.
            </h2>
            <ol className="how-list">
              <li>
                <strong>Make a plan.</strong>
                <p>
                  Choose the cabin, review preferences, and agree on shares.
                </p>
              </li>
              <li>
                <strong>Everyone commits.</strong>
                <p>
                  Each person approves the exact version and authorizes their
                  own share.
                </p>
              </li>
              <li>
                <strong>Plans can change.</strong>
                <p>
                  If someone drops out, their hold is released and the group
                  gets new options. Everyone approves the new version, and only
                  ever authorizes the difference; an earlier yes never covers a
                  higher price.
                </p>
              </li>
              <li>
                <strong>Book, together.</strong>
                <p>
                  Only when everyone is ready, capture payments and reserve the
                  stay.
                </p>
              </li>
            </ol>
            <p className="terms">
              This build uses local merchant inventory and either simulated
              payments or explicitly selected PayPal sandbox payments. The
              optional model connection interprets notes; it cannot move money.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
