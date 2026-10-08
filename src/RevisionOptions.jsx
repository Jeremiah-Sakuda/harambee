import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const usd = (cents) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
const first = (name) => name.split(" ")[0];

function Provenance({ data }) {
  if (data.provider === "openai")
    return (
      <p className="rev-provenance">
        <Sparkles size={14} /> Suggested by {data.model} in{" "}
        {(data.latencyMs / 1000).toFixed(1)}s · every quote, amount and share
        checked by code
      </p>
    );
  return (
    <p className="rev-provenance local">
      <ShieldCheck size={14} /> Local planner · not AI. It compares cabins and
      uses only plain “Name: $amount” lines.
      {data.fallbackReason && ` ${data.fallbackReason}`}
    </p>
  );
}

export default function RevisionOptions({
  data,
  busy,
  noteLines,
  participants,
  onSuggest,
  onPublish,
  onEditNotes,
  requests = [],
  onRequest,
  onDemoAnswer,
  onCancelTrip,
}) {
  // The latest request to each person about this amount (or any "ask"), with its status.
  const requestFor = (participantId, kind, amountCents = null) =>
    [...requests]
      .reverse()
      .find(
        (r) =>
          r.participantId === participantId &&
          r.kind === kind &&
          (kind === "ask" || r.amountCents === amountCents),
      );
  // Called as a function, not rendered as a component, so its buttons survive each 3 s refresh.
  const requestStatus = ({
    request,
    name,
    kind,
    amountCents = null,
    participantId,
    label,
  }) =>
    request?.status === "confirmed" ? (
      <span className="rev-request">
        <small className="rev-answered">
          <CheckCircle2 size={14} /> {name} answered · their limit now applies
        </small>
      </span>
    ) : request?.status === "pending" ? (
      <span className="rev-request">
        <button className="secondary" disabled>
          Waiting for {name}…
        </button>
        <button className="link-button" onClick={() => onDemoAnswer(request)}>
          Demo shortcut: answer as {name}
        </button>
      </span>
    ) : (
      <span className="rev-request">
        {request?.status === "declined" && (
          <small className="rev-wait">{name} isn’t ready yet.</small>
        )}
        <button
          className="secondary"
          disabled={busy}
          onClick={() => onRequest({ participantId, amountCents }, kind)}
        >
          {request?.status === "declined" ? "Ask again" : label}
        </button>
      </span>
    );
  if (!data)
    return (
      <section className="rev-panel" id="revision-options">
        <div className="rev-head">
          <div>
            <h3>Let the group’s own words shape the new plan</h3>
            <p>
              Reads the {noteLines} lines in Planning notes and proposes options
              for the remaining group. Code checks every number; nobody pays
              more until they approve.
            </p>
          </div>
          <button className="primary" disabled={busy} onClick={onSuggest}>
            {busy ? "Reading the chat…" : "Suggest options"}{" "}
            <Sparkles size={16} />
          </button>
        </div>
        <button className="link-button" onClick={onEditNotes}>
          Review the group chat first
        </button>
      </section>
    );
  return (
    <section className="rev-panel" id="revision-options" aria-live="polite">
      <div className="rev-head">
        <div>
          <h3>Options for the new group</h3>
          {data.summary && (
            <p className="rev-summary">
              {data.provider === "openai" && (
                <strong>What the AI read: </strong>
              )}
              {data.summary}
            </p>
          )}
          <Provenance data={data} />
        </div>
        <button className="secondary" disabled={busy} onClick={onSuggest}>
          {busy ? "Reading…" : "Re-read the chat"}
        </button>
      </div>
      {data.clarifications?.length > 0 && (
        <div className="rev-questions">
          <strong>
            <MessageCircleQuestion size={15} /> Worth asking first
          </strong>
          <ul>
            {data.clarifications.map((c, i) => (
              <li key={i}>
                {(() => {
                  const name = first(
                    participants.find((p) => p.id === c.participantId)?.name ??
                      "",
                  );
                  // Skip the "Maya:" prefix when the question already starts with her name.
                  return name && !c.question.startsWith(name)
                    ? `${name}: `
                    : "";
                })()}
                {c.question}
                {c.source === "code" && (
                  <small className="rev-flag"> · flagged by code</small>
                )}
                {c.participantId && c.amountCents
                  ? requestStatus({
                      request: requestFor(
                        c.participantId,
                        "confirm",
                        c.amountCents,
                      ),
                      name: first(
                        participants.find((p) => p.id === c.participantId)
                          ?.name ?? "",
                      ),
                      kind: "confirm",
                      amountCents: c.amountCents,
                      participantId: c.participantId,
                      label: `Send ${first(participants.find((p) => p.id === c.participantId)?.name ?? "")} a confirmation request (${usd(c.amountCents)})`,
                    })
                  : c.participantId &&
                    requestStatus({
                      request: requestFor(c.participantId, "ask"),
                      name: first(
                        participants.find((p) => p.id === c.participantId)
                          ?.name ?? "",
                      ),
                      kind: "ask",
                      label: `Ask ${first(participants.find((p) => p.id === c.participantId)?.name ?? "")} for a firm limit`,
                      participantId: c.participantId,
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.options.length > 0 && !data.options.some((o) => o.feasible) && (
        <div className="rev-stuck">
          <strong>No option fits everyone’s limits.</strong>
          <p>
            Anyone who can go higher can raise their own budget in their view;
            then re-read the chat. Or end the trip: every hold is released and
            nobody is charged.
          </p>
          <button className="secondary" disabled={busy} onClick={onCancelTrip}>
            Cancel trip & release every hold
          </button>
        </div>
      )}
      <div className="rev-options">
        {data.options.map((o) => (
          <article
            key={o.id}
            className={`rev-option${o.ready ? " ready" : ""}`}
          >
            <header>
              <h4>{o.title}</h4>
              <span className="rev-tag">
                {o.source === "openai"
                  ? o.matchesRule
                    ? "AI suggestion · same split as the standard rule"
                    : "AI suggestion"
                  : o.source === "local-planner"
                    ? o.matchesRule
                      ? "Local planner · same split as the standard rule"
                      : "Local planner"
                    : o.alsoSuggested
                      ? "Standard rule · also suggested by AI"
                      : "Standard rule"}
              </span>
            </header>
            <p className="rev-explain">{o.explanation}</p>
            {o.tradeoff && <p className="rev-tradeoff">{o.tradeoff}</p>}
            {o.basis?.length > 0 && (
              <ul className="rev-basis" aria-label="Why the AI suggested this">
                {o.basis.map((b, i) => (
                  <li key={i}>
                    <strong>Why:</strong> “{b.quote}” — {first(b.name)}, line{" "}
                    {b.line}
                  </li>
                ))}
              </ul>
            )}
            {[
              ["elsewhere", "Points to another option"],
              ["opposes", "Argues against this option"],
              ["superseded", "Earlier message, since replaced"],
            ].map(([relation, label]) => {
              const quotes = (o.considered ?? []).filter(
                (b) => (b.relation ?? "elsewhere") === relation,
              );
              return (
                quotes.length > 0 && (
                  <p key={relation} className="rev-considered">
                    {label}:{" "}
                    {quotes
                      .map((b) => `“${b.quote}” — ${first(b.name)}`)
                      .join("; ")}
                  </p>
                )
              );
            })}
            {o.combinedAfter?.length > 0 && (
              <p className="rev-note">
                After {o.combinedAfter.join(" and ")} confirmed, the standard
                rule gives this same split, so it’s shown once.
              </p>
            )}
            {o.removedLimits?.length > 0 && (
              <p className="rev-note">
                Code removed a limit this suggestion used:{" "}
                {o.removedLimits.join(" ")}
              </p>
            )}
            {o.explanationReplaced && !o.removedLimits?.length && (
              <p className="rev-note">
                The suggestion included figures, so code wrote this summary from
                the computed shares.
              </p>
            )}
            {o.exceedsStated?.map((x) => (
              <p key={x.name} className="rev-note rev-warn">
                Asks {x.name} for {usd(x.shareCents)}, above the{" "}
                {usd(x.statedCents)} {x.name} wrote in the chat.
              </p>
            ))}
            {o.ignoresStatedLimits && !o.exceedsStated?.length && (
              <p className="rev-note">
                Uses saved budgets only. It ignores limits people stated in the
                chat.
              </p>
            )}
            {o.cabinChange && (
              <p className="rev-note">
                New cabin: {o.listingName}, {usd(o.total)}. Current holds are
                released and everyone approves a fresh checkout.
              </p>
            )}
            {!o.feasible ? (
              <p className="rev-infeasible">{o.reason}</p>
            ) : (
              <table className="rev-table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">New share</th>
                    <th scope="col">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {o.rows.map((r) => (
                    <tr key={r.participantId}>
                      <td>{first(r.name)}</td>
                      <td>
                        <strong>{usd(r.share)}</strong>
                        {r.previousShare !== null && (
                          <small> was {usd(r.previousShare)}</small>
                        )}
                      </td>
                      <td>
                        {o.cabinChange
                          ? `New checkout ${usd(r.share)}`
                          : r.additional
                            ? `+${usd(r.additional)} top-up`
                            : "No new hold"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {o.confirmations
              .filter(
                (c) =>
                  c.needed ||
                  (c.confirmed &&
                    requestFor(c.participantId, "confirm", c.amountCents)),
              )
              .map((c) => (
                <div key={c.participantId} className="rev-confirm">
                  <p>
                    {c.confirmed ? (
                      <>
                        <CheckCircle2 size={14} /> {first(c.name)} confirmed a{" "}
                        {usd(c.amountCents)} limit.
                      </>
                    ) : (
                      <>
                        {first(c.name)} wrote: “
                        {c.quote.replace(/^[^:]*:\s*/, "")}”
                      </>
                    )}
                  </p>
                  {!c.confirmed &&
                    requestStatus({
                      request: requestFor(
                        c.participantId,
                        "confirm",
                        c.amountCents,
                      ),
                      name: first(c.name),
                      kind: "confirm",
                      amountCents: c.amountCents,
                      participantId: c.participantId,
                      label: `Send ${first(c.name)} a confirmation request`,
                    })}
                </div>
              ))}
            {o.feasible && (
              <button
                className="primary full"
                disabled={busy || !o.ready}
                onClick={() => onPublish(o)}
              >
                Publish this option <ArrowRight size={16} />
              </button>
            )}
            {o.feasible && !o.ready && (
              <small className="rev-wait">
                Waiting for{" "}
                {o.confirmations
                  .filter((c) => c.needed)
                  .map((c) => first(c.name))
                  .join(" and ")}{" "}
                to confirm that limit. Until then these shares use only limits
                stated in the chat; everyone’s saved budgets apply once it’s
                confirmed.
              </small>
            )}
          </article>
        ))}
      </div>
      {data.discarded?.length > 0 && (
        <details className="rev-discarded">
          <summary>
            {data.discarded.length} suggestion
            {data.discarded.length === 1 ? " was" : "s were"} discarded by
            verification
          </summary>
          <ul>
            {data.discarded.map((d, i) => (
              <li key={i}>
                <strong>{d.title}:</strong> {d.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
