import test from "node:test";
import { scenarios } from "./helpers/sandbox-scenarios.mjs";

// This suite cannot reach PayPal or another network service, even accidentally.
globalThis.fetch = async () => {
  throw Error("Network disabled in offline sandbox matrix");
};
for (const scenario of scenarios) {
  // Every scenario now passes, so a regression of a once-known gap fails CI instead of
  // being reported as a TODO. scripts/simulate-sandbox.mjs still reports the gap history.
  test(scenario.title, async () => {
    scenario.verify(await scenario.run());
  });
}
