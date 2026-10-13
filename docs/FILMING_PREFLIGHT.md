# Demo rehearsal before filming

Run this on filming day with the local model credentials configured:

```sh
npm run filming:preflight
```

It runs the app’s sample chat after Sam withdraws exactly three times. Every result is saved, including fallback. Dated outputs and a narration check go in the gitignored `submission/filming/` directory; historical committed evaluations are preserved. Its scope is AI rehearsal; payment recording follows the filming run sheet.

The check records the provider, model, latency, common limit confirmations, option shares and supporting quotes. It checks source hashes before and after the runs and exits unsuccessfully if a run falls back or source changes. Question wording may vary. Match narration to the actual recorded take, including the model label and any fallback, even when it differs from the rehearsal.

`npm run filming:preflight -- --dry-run` previews the command without a model call. The private filming run sheet covers recording, upload and placement of the final video link.
