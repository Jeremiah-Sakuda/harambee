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
  onUpdateBudget,
}) {
  const first = person.name.split(" ")[0];
  const [amount, setAmount] = useState("");
  const cents = Math.round(Number(amount) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  // One click may lower a saved budget, never raise it; raising is a deliberate edit.
  const raises =
    request.kind === "confirm" &&
    person.budget != null &&
    request.amountCents > person.budget;
  return (
    <section
      className="limit-request"
      id="limit-request"
      aria-label={`Question for ${first}`}
    >
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
            The group chat your organizer pasted shows this message from you:
          </p>
          {request.quote && (
            <blockquote className="limit-quote">“{request.quote}”</blockquote>
          )}
          {raises ? (
            <>
              <p>
                That’s above your saved budget of {usd(person.budget)}, so it
                can’t be confirmed in one click. If you really can go higher,
                update your budget yourself.
              </p>
              {onUpdateBudget && (
                <button
                  className="primary full"
                  disabled={busy}
                  onClick={onUpdateBudget}
                >
                  Update my budget
                </button>
              )}
            </>
          ) : (
            <>
              <p>
                Confirming saves {usd(request.amountCents)} as your budget
                {person.budget != null && ` (now ${usd(person.budget)})`}.
                Nothing is charged; you’ll still review and approve your new
                share.
              </p>
              <button
                className="primary full"
                disabled={busy}
                onClick={() => onConfirm(request.amountCents)}
              >
                Confirm {usd(request.amountCents)} as my limit
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <h2>What’s your firm limit, {first}?</h2>
          <p>
            {departed || "Someone"} left, so the group is choosing a new plan.
            {request.quote ? " You wrote:" : ""}
          </p>
          {request.quote && (
            <blockquote className="limit-quote">“{request.quote}”</blockquote>
          )}
          <p>
            What’s the most you can put toward this trip? Harambee won’t guess
            from an uncertain message.
          </p>
          <label className="field">
            My firm limit (USD)
            <input
              inputMode="decimal"
              value={amount}
              placeholder="Amount in USD"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p className="secure-note">
            Your organizer sees that you answered, not this number. If it caps
            your share, your new share will equal it.
          </p>
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
