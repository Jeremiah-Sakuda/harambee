# Offline payment matrix — October 7, 2026

[results.json](results.json) records sixteen synthetic scenarios against the actual payment coordinator and lab: fourteen passed, two known failures, no unexpected failures. Provider calls: zero.

Both known failures concern the same issue: amount/currency verification stops recovery, but the participant payment can be labeled captured before verification succeeds. Booking completion remains blocked, and neither another capture nor an unverified refund is sent.

The report includes the source commit, individual SHA-256 hashes, whether tested files had uncommitted changes, and a check that those hashes stayed stable through execution. The runner and scenarios are committed alongside this evidence. See [SANDBOX_TESTING.md](../../SANDBOX_TESTING.md) for commands and interpretation.
