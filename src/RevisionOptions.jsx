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
  onConfirm,
  onEditNotes,
}) {
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
          {data.summary && <p>{data.summary}</p>}
          <Provenance data={data} />
        </div>
        <button className="secondary" disabled={busy} onClick={onSuggest}>
          {busy ? "Reading…" : "Ask again"}
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
                {c.participantId &&
                  `${first(participants.find((p) => p.id === c.participantId)?.name ?? "")}: `}
                {c.question}
                {c.source === "code" && (
                  <small className="rev-flag"> · flagged by code</small>
                )}
              </li>
            ))}
          </ul>
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
                  ? "AI suggestion"
                  : o.source === "local-planner"
                    ? "Local planner"
                    : "Standard rule"}
              </span>
            </header>
            <p className="rev-explain">{o.explanation}</p>
            {o.tradeoff && <p className="rev-tradeoff">{o.tradeoff}</p>}
            {o.removedLimits?.length > 0 && (
              <p className="rev-note">
                Code removed a limit this suggestion used:{" "}
                {o.removedLimits.join(" ")}
              </p>
            )}
            {o.explanationReplaced && !o.removedLimits?.length && (
              <p className="rev-note">
                The suggestion’s own figures didn’t match the math, so this
                summary was written by code.
              </p>
            )}
            {o.ignoresStatedLimits && (
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
                  (c.confirmed && data.asked?.includes(c.participantId)),
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
                  {!c.confirmed && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => onConfirm(c)}
                    >
                      Ask {first(c.name)} to confirm {usd(c.amountCents)}
                    </button>
                  )}
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
