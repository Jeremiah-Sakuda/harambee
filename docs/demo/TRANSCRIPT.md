# Harambee — demo preview

Edited narrated walkthrough using actual local UI captures. Payments are simulated; provider/model execution is not established by this video. Synthetic examples are not user-validation evidence.

Application source: e28bc2a8811465b09166f44064bd2d080b158b76

## 00:00:00.000 — Agree before anyone fronts the cost

Harambee helps friends agree on a trip without asking one organizer to front the entire bill. This six hundred dollar cabin is a local fixture. This preview uses actual screens from the working app, edited as still captures with synthesized narration. Every payment shown is simulated. Separate participant views keep each person's review focused on their own commitment.

Capture: frames/01-board.png

## 00:00:21.451 — A saved budget survives the review

Maya saved a one hundred twenty dollar ceiling. Saving it did not approve the old one hundred fifty dollar share or authorize a payment. The organizer published version two: one hundred twenty dollars for Maya and one hundred sixty dollars for each friend. Opening review from Organizer now preserves Maya's saved ceiling. Budget saving and approval are separate decisions. Any higher share requires fresh consent.

Capture: frames/02-saved-ceiling.png

## 00:00:46.090 — Explicit consent on a phone

The phone view shows the exact version and personal share, the additional hold, and the saved ceiling. Participant rows now stack into readable cards and actions have larger touch targets. The split rule is visible before consent. Private budget fields are withheld from other views, but the app acknowledges that final shares can still reveal information about a ceiling.

Capture: frames/03-mobile-consent.png

## 00:01:07.232 — An unknown capture stops the booking

After all four people approved version two, we deliberately timed out a simulated capture. Booking stopped. The summary shows three hundred twenty dollars still held and one hundred twenty dollars captured. A separate one hundred sixty dollar capture has an unknown outcome. Unknown is not failure and is not permission to charge again. The coordinator retains the operation evidence for reconciliation.

Capture: frames/04-unknown.png

## 00:01:31.097 — Recovery stays honest about the money

Recovery reconciled that unknown capture, refunded the two hundred eighty dollars that had actually been captured in the simulator, and released the unused holds. The final summary now separates held, captured, refund pending and returned amounts. The plan is cancelled with nothing left to recover. Restart tests also verify that a persisted pending void cannot falsely become a completed recovery.

Capture: frames/05-recovered.png

## 00:01:54.753 — Reviewable notes, clear evidence boundaries

The local parser now reads a thousand-dollar amount correctly and asks for clarification on a negated budget. A note opens a participant review with its source visible; applying a suggestion, saving a ceiling and approving remain separate. Twenty-one frozen offline cases pass. The optional integrated PayPal sandbox path supports distinct buyers, explicit top-ups and recovery, but actual provider execution is still pending credentials. User research and a public submission video remain next evidence steps.

Capture: frames/06-notes.png
