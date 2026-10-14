# Direct-booking operator pilot

**Pilot proposal:** one independent cabin or glamping operator that accepts PayPal, one fixed-price stay, USD, and groups of 3–8. Harambee gives each guest an exact share to approve and lets the group revise its agreement before booking. The operator receives each guest’s payment through its configured merchant account.

## Decision to test

Does offering individual commitments and explicit re-approval produce enough additional completed group bookings to cover payment, recovery and support costs?

Compare with the same operator’s current direct checkout: the organizer pays the required amount, then collects from friends. Offer the same inventory, total price and cancellation terms in both paths. Track completed bookings per eligible group inquiry, time to commitment and support effort. Record how each group was assigned or chose its checkout, so selection differences remain visible.

## Inventory and collection

| Stage | Proposed operator agreement |
| --- | --- |
| Quote | Disclose stay price, any platform fee, cancellation terms and the group’s 48-hour collection deadline before anyone approves. |
| Collection | Use a time-limited quote with availability rechecked at booking. Dates remain available to other customers during collection; explain that individual payment holds do not reserve the cabin. An operator choosing exclusive inventory protection must price and record that commitment separately. |
| Ready to book | Acquire a short reservation lease only after the current plan has every required approval. Recheck the total and availability before capturing. A changed total requires a new agreement and approvals. |
| Successful booking | Capture current approved shares and commit the reservation. Send a booking confirmation and individual payment receipts. |
| Availability or collection failure | Release uncharged holds; refund captured payments if the reservation cannot commit. Keep unresolved outcomes visible until the provider confirms them. |
| After booking | Apply the disclosed operator cancellation terms. A guest leaving after booking follows those terms rather than automatically reallocating the booking. |

The demo’s local reservation service exercises the lease/commit/recovery sequence. Operator onboarding connects that sequence to the operator’s inventory system.

## Costs and responsibilities to agree before launch

| Item | Proposed owner | Pilot measurement |
| --- | --- | --- |
| PayPal processing | Operator as merchant | Actual fees across initial captures and top-ups; retained fees after refunds |
| Platform fee | Operator under the pilot agreement; any guest-facing fee included in the approved total | Fee collected per completed booking and treatment on cancellation |
| Inventory availability and cancellation policy | Operator | Availability conflicts, expired quotes and displaced bookings if inventory is protected |
| Reconciliation and application support | Harambee | Support minutes and provider exceptions per attempt |
| Guest service and reservation changes | Operator, with escalation to Harambee for payment state | Operator support minutes and refund resolution time |
| Failed-booking recovery cost | Explicit pilot allocation between operator and Harambee | Retained provider fees, staff effort and any agreed customer remedy |

Use actual processor charges and agreed fees in the comparison. Multiple captures or top-ups may add per-transaction costs, so count every operation rather than treating a group as one transaction.

## Scorecard and decision

Record eligible inquiries, started collections, completed bookings, dropout revisions completed, abandonment, availability conflicts, payment fees, refund costs and support minutes for each checkout path. Measure organizer effort as an observed task or participant report, separately from model response time.

For each path, calculate completed-booking contribution after agreed variable booking costs, processing fees, recovery costs, support labor and platform fees. Normalize by eligible inquiry and include any inventory opportunity cost. A pilot succeeds when completed-booking contribution improves while every guest retains explicit control of their approved share. Record conversion and support changes separately so the operator can see the tradeoff.

Before recruitment, agree on the observation window, number of eligible inquiries and minimum worthwhile improvement. Retain reasons for incomplete trips as well as successful bookings. This document defines a proposed operating agreement and measurement plan.
