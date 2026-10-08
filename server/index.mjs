import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Engine, seed, catalog, allocate, DomainError } from "./domain.mjs";
import { Store } from "./store.mjs";
import { interpret } from "./ai.mjs";
import { PayPalSandbox } from "./paypal.mjs";
import { GroupPayments } from "./group-payments.mjs";
import { SandboxLab } from "./sandbox-lab.mjs";
import {
  proposeRevisions,
  recheckRevisions,
  resolveLimitRequest,
  resolveOption,
} from "./revision-options.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {}
const store = new Store(
  process.env.DATA_FILE || path.join(root, "data", "plan.json"),
);
const lab = new SandboxLab(
  new Store(
    process.env.SANDBOX_DATA_FILE ||
      path.join(root, "data", "sandbox-lab.json"),
  ),
  process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    ? new PayPalSandbox()
    : null,
);
let engine = new Engine(store);
const rates = new Map();
let mutating = false;
const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
};
const body = async (req) => {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 16000) throw new DomainError("Request too large.", 413);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new DomainError("Invalid JSON.", 400);
  }
};
// Origin is already restricted to loopback hosts below; PayPal returns buyers there.
const appUrl = (req) =>
  req.headers.origin ||
  process.env.APP_URL ||
  `http://127.0.0.1:${Number(process.env.PORT) || 3101}`;
const server = http.createServer(async (req, res) => {
  let ownsMutation = false;
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      engine.sweepExpiry();
      const origin = req.headers.origin;
      if (origin) {
        let parsed;
        try {
          parsed = new URL(origin);
        } catch {
          throw new DomainError("Invalid origin.", 403);
        }
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
          throw new DomainError("Only local demo origins are accepted.", 403);
      }
      const actor = req.headers["x-demo-actor"] || "organizer";
      if (
        !["organizer", ...engine.state.participants.map((p) => p.id)].includes(
          actor,
        )
      )
        throw new DomainError("Unknown demo role.", 403);
      if (req.method === "GET" && url.pathname === "/api/health")
        return json(res, 200, { ok: true, provider: engine.state.provider });
      if (req.method === "GET" && url.pathname === "/api/sandbox") {
        engine.assertOrganizer(actor);
        return json(res, 200, {
          ...lab.view(),
          sessions: lab.state.sessions.filter((s) => !s.groupPlanId),
        });
      }
      if (req.method === "GET" && url.pathname === "/api/state")
        return json(res, 200, engine.view(actor));
      if (req.method !== "POST") throw new DomainError("Not found.", 404);
      const rateKey = req.socket.remoteAddress;
      const old = rates.get(rateKey);
      const rate =
        old && Date.now() - old.start < 60000
          ? old
          : { start: Date.now(), count: 0 };
      rate.count++;
      rates.set(rateKey, rate);
      if (rate.count > 150)
        throw new DomainError(
          "Please slow down and try again in a minute.",
          429,
        );
      const input = await body(req);
      // Read-only model calls run outside the mutation lock so they never block plan changes.
      if (url.pathname === "/api/interpret")
        return json(res, 200, await interpret(input.text));
      if (url.pathname === "/api/revision-options") {
        engine.assertOrganizer(actor);
        engine.assertOpen();
        // A reset or another change during the model call must not let this old engine save.
        const started = engine;
        return json(
          res,
          200,
          await proposeRevisions(started, {
            notes: input.notes,
            isCurrent: () => started === engine && !mutating,
          }),
        );
      }
      if (url.pathname === "/api/revision-options/recheck") {
        engine.assertOrganizer(actor);
        return json(res, 200, recheckRevisions(engine, input.batchId));
      }
      if (mutating)
        throw new DomainError(
          "Another plan operation is in progress. Refresh shortly.",
        );
      mutating = true;
      ownsMutation = true;
      const group = new GroupPayments(engine, lab);
      const payments =
        engine.state.provider === "paypal-sandbox" ? group : engine;
      if (url.pathname.startsWith("/api/sandbox/")) {
        engine.assertOrganizer(actor);
        if (
          input.groupPlanId ||
          lab.state.sessions.some((s) => s.id === input.id && s.groupPlanId)
        )
          throw new DomainError(
            "Group payments can only be changed through the versioned trip coordinator.",
          );
        const labAction = url.pathname.split("/").at(-1);
        return json(res, 200, {
          ...(await lab.run(labAction, {
            id: input.id,
            amount: input.amount,
            ...(labAction === "create"
              ? { returnUrl: `${appUrl(req)}/?paypal=lab` }
              : {}),
          })),
          sessions: lab.state.sessions.filter((s) => !s.groupPlanId),
        });
      }
      switch (url.pathname) {
        case "/api/provider":
          engine.assertOrganizer(actor);
          if (
            engine.state.payments.length ||
            !["simulated", "paypal-sandbox"].includes(input.provider)
          )
            throw new DomainError(
              "Choose a provider before the first payment.",
            );
          if (input.provider === "paypal-sandbox" && !lab.client)
            throw new DomainError(
              "Configure PayPal sandbox credentials and restart first.",
              503,
            );
          engine.state.provider = input.provider;
          engine.log(
            `Payment execution changed to ${input.provider}. Cabin inventory remains local.`,
          );
          break;
        case "/api/complete-approval":
          if (engine.state.provider !== "paypal-sandbox")
            throw new DomainError("Sandbox mode is required.");
          await group.complete(actor, input);
          break;
        case "/api/reconcile-payment":
          if (engine.state.provider !== "paypal-sandbox")
            throw new DomainError("Sandbox mode is required.");
          await group.reconcile(actor, input.paymentId);
          break;
        case "/api/reset":
          engine.assertOrganizer(actor);
          if (engine.state.provider === "paypal-sandbox") {
            // A confirmed booking's captures are final; anything else must be resolved first.
            const settled = engine.state.payments.every(
              (p) =>
                ["voided", "refunded", "abandoned"].includes(p.status) ||
                (engine.state.status === "confirmed" &&
                  p.status === "captured"),
            );
            if (!settled)
              throw new DomainError(
                "Resolve all sandbox payments before resetting; provider evidence must be preserved.",
              );
            // Keep the finished trip's provider evidence before replacing it.
            if (engine.state.payments.length)
              new Store(
                path.join(
                  path.dirname(store.path),
                  "archive",
                  `plan-${engine.state.id}.json`,
                ),
              ).save(engine.state);
          }
          store.save(seed());
          engine = new Engine(store);
          break;
        case "/api/create": {
          engine.assertOrganizer(actor);
          if (
            typeof input.title !== "string" ||
            input.title.trim().length < 3 ||
            input.title.length > 100
          )
            throw new DomainError(
              "Give your plan a title between 3 and 100 characters.",
              400,
            );
          const names = input.names
            ?.split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          if (
            !names ||
            names.length < 3 ||
            names.length > 8 ||
            names.some((n) => n.length > 60) ||
            new Set(names).size !== names.length
          )
            throw new DomainError(
              "Enter 3–8 distinct names separated by commas.",
              400,
            );
          const listing = catalog.find((c) => c.id === input.listingId);
          if (!listing) throw new DomainError("Select a cabin.", 400);
          if (names.length > listing.guests)
            throw new DomainError("This cabin cannot fit the full group.", 400);
          if (
            !["collecting", "cancelled", "confirmed"].includes(
              engine.state.status,
            ) ||
            engine.state.payments.some(
              (p) => !["voided", "refunded"].includes(p.status),
            )
          )
            throw new DomainError(
              "Reset the demo or finish recovery before replacing this plan.",
            );
          const s = seed();
          s.title = input.title.trim();
          s.listingId = listing.id;
          s.participants = names.map((name, i) => ({
            id: `person-${i + 1}`,
            name,
            initials: name
              .split(/\s/)
              .map((v) => v[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
            budget: null,
            active: true,
          }));
          s.versions[0].listingId = listing.id;
          s.versions[0].total = listing.total;
          s.versions[0].shares = allocate(listing.total, s.participants);
          // A new round keeps the previous round's outcome on record.
          if (["cancelled", "confirmed"].includes(engine.state.status)) {
            const returned = engine.state.payments
              .filter((p) => p.status === "refunded")
              .reduce((n, p) => n + p.amount, 0);
            s.audit.push({
              id: randomUUID(),
              at: new Date().toISOString(),
              type: "plan",
              text:
                engine.state.status === "confirmed"
                  ? `Previous round “${engine.state.title}” was booked and paid.`
                  : `Previous round “${engine.state.title}” ended without a booking: $${(returned / 100).toFixed(2)} returned and every hold released.`,
            });
          }
          store.save(s);
          engine = new Engine(store);
          break;
        }
        case "/api/approve":
          // PayPal returns the buyer to the same local origin they started from.
          await payments.approve(actor, input.version, {
            appUrl: appUrl(req),
          });
          break;
        case "/api/withdraw":
          await payments.withdraw(actor, input.participantId);
          break;
        case "/api/revise":
          // Options publish by server-issued ID: shares and provenance never come from the client.
          await payments.revise(
            actor,
            input.optionId
              ? (engine.assertOrganizer(actor),
                resolveOption(engine, input.optionId))
              : { listingId: input.listingId },
          );
          break;
        case "/api/request-limit":
          engine.assertOrganizer(actor);
          engine.requestLimit(actor, resolveLimitRequest(engine, input));
          break;
        case "/api/confirm-limit":
          engine.confirmLimit(actor, input.amountCents, input.requestId);
          break;
        case "/api/decline-limit":
          engine.declineLimit(actor, input.requestId);
          break;
        case "/api/budget":
          engine.budget(actor, input.amount);
          break;
        case "/api/book":
          await payments.book(actor, input);
          break;
        case "/api/recover":
          await payments.recover(actor, { retryRefunds: !!input.retryRefunds });
          break;
        case "/api/expire":
          await payments.expire(actor);
          break;
        case "/api/cancel":
          await payments.cancel(actor);
          break;
        default:
          throw new DomainError("Not found.", 404);
      }
      return json(res, 200, engine.view(actor));
    }
    const dist = path.join(root, "dist");
    const filename = decodeURIComponent(url.pathname);
    let requested = path.resolve(dist, `.${filename}`);
    if (!requested.startsWith(`${dist}${path.sep}`) && requested !== dist)
      throw new DomainError("Invalid path.", 400);
    if (!existsSync(requested) || statSync(requested).isDirectory())
      requested = path.join(dist, "index.html");
    if (!existsSync(requested)) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(
        "Harambee API is ready. Run npm run dev for the app, or npm run build then npm start.",
      );
    }
    const ext = path.extname(requested);
    res.writeHead(200, {
      "Content-Type":
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        }[ext] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(readFileSync(requested));
  } catch (err) {
    json(res, err.status || 500, {
      error: err.status
        ? err.message
        : "Something went wrong. Please try again.",
    });
  } finally {
    if (ownsMutation) mutating = false;
  }
});
async function sweep() {
  if (mutating) return;
  if (engine.state.provider !== "paypal-sandbox") return engine.sweepExpiry();
  if (
    ["collecting", "ready", "revision_required"].includes(
      engine.state.status,
    ) &&
    Date.parse(engine.state.deadline) <= Date.now()
  ) {
    mutating = true;
    try {
      await new GroupPayments(engine, lab).expire("organizer");
    } catch {
    } finally {
      mutating = false;
    }
  }
}
sweep();
setInterval(sweep, 30000).unref();
server.listen(
  Number(process.env.PORT) || 3101,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `Harambee listening at http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3101} · ${lab.client ? "PayPal sandbox credentials loaded" : "SIMULATED payments only (no PayPal sandbox credentials)"} · ${process.env.OPENAI_API_KEY ? "model interpretation enabled" : "local parser only"}`,
    ),
);
