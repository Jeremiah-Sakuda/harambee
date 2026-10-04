# Browser verification

Verified October 3, 2026 against the local production build.

- Four participant approvals enabled booking only after exact shares were authorized in the simulator.
- A simulated lost capture response stopped collection. Recovery reconciled and refunded the captured amounts, voided unused holds, and cancelled the fixture reservation.
- The planning parser returned source-linked drafts without changing consent or payment state.
- Missing sandbox credentials disabled sandbox order creation explicitly.
- Demo reset restored the original four-person plan.
- Desktop, 375 px phone, and 812 px landscape layouts had no horizontal page overflow. No browser console errors were observed during these flows.

This is manual browser verification, not a claim of real PayPal transactions, model accuracy, or complete accessibility certification.

![Local Harambee demo](preview.png)
