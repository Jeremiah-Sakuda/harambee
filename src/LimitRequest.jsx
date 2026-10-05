import React, { useState } from "react";

const usd = (cents) =>
  `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;

// What one participant sees when the organizer asks them about their limit. "confirm" asks them
// to adopt an amount an option read from their own message; "ask" asks for a firm limit where
// their message was uncertain. Nothing here approves or charges anything.
export default function LimitRequest({
  request,
  person,
  departed,
  busy,
  demo,
  onConfirm,
  onDecline,
}) {
  const first = person.name.split(" ")[0];
  const [amount, setAmount] = useState("");
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  return (
    <section className="limit-request" aria-label={`Question for ${first}`}>
      <span className="eyebrow">A QUICK QUESTION FROM YOUR ORGANIZER</span>
      {demo && (
        <p className="demo-as">
          Demo shortcut: answering as {person.name}. In a real trip only {first}{" "}
          would see this.
        </p>
      )}
      {request.kind === "confirm" ? (
        <>
          <h2>
            Use {usd(request.amountCents)} as your limit, {first}?
          </h2>
          <p>
            {departed || "Someone"} left, so the group is choosing a new plan.
            One option uses what you wrote:
          </p>
          {request.quote && (
            <blockquote className="limit-quote">“{request.quote}”</blockquote>
          )}
          <p>
            Confirming saves {usd(request.amountCents)} as your budget. Nothing
            is charged; you’ll still review and approve your new share.
          </p>
          <button
            className="primary full"
            disabled={busy}
            onClick={() => onConfirm(request.amountCents)}
          >
            Confirm {usd(request.amountCents)} as my limit
          </button>
        </>
      ) : (
        <>
          <h2>What’s your firm limit, {first}?</h2>
          <p>
            The group is choosing a new plan, and Harambee won’t guess from an
            uncertain message.
          </p>
          {request.question && (
            <blockquote className="limit-quote">{request.question}</blockquote>
          )}
          <label className="field">
            My firm limit (USD)
            <input
              inputMode="decimal"
              value={amount}
              placeholder="e.g. 160"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button
            className="primary full"
            disabled={busy || !valid}
            onClick={() => onConfirm(cents)}
          >
            Save {valid ? usd(cents) : "it"} as my limit
          </button>
        </>
      )}
      <button className="secondary full" disabled={busy} onClick={onDecline}>
        Not now
      </button>
    </section>
  );
}
