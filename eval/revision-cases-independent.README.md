# Independent no-amount briefs

`revision-cases-independent.json`: 16 synthetic briefs for the frozen comparison in [EVALUATION_PROTOCOL.md](../docs/EVALUATION_PROTOCOL.md).

- **Author:** a separate Claude agent given only the protocol's handoff (the three remaining friends, the two cabins, the case schema and the kinds of messages to cover). It was told not to read any project file and reported that it didn't; it saw no development briefs, code or model outputs. It is not a human author, and it is the same model family as the agent that develops this project, so treat this as a step toward independence, not a substitute for briefs written by a person.
- **Created:** 2026-10-13. Labels (`expect`) were written by the author before anything ran and are committed unedited.
- **Frozen code:** commit `0d7a01d` (model prompt, verifier, rules comparator and scorers). Nothing was changed after seeing results.
- **SHA-256:** `8d74bc5705633d02e1a2d1b4b0eac983019dc354a399ad30b2fb8dcae4979892`
