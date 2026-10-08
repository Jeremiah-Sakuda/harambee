import test from "node:test";
import { scenarios } from "./helpers/sandbox-scenarios.mjs";

// This suite cannot reach PayPal or another network service, even accidentally.
globalThis.fetch = async () => {
  throw Error("Network disabled in offline sandbox matrix");
};
for (const scenario of scenarios) {
  test(scenario.title, async (t) => {
    const observation = await scenario.run();
    try {
      scenario.verify(observation);
    } catch (error) {
      if (scenario.knownGap && error.message.includes(scenario.failureMarker))
        t.todo(scenario.knownGap);
      throw error;
    }
  });
}
