// Verifies sandbox credentials by requesting an OAuth token. Creates no orders and moves no money.
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {}
const { PAYPAL_CLIENT_ID: id, PAYPAL_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error(
    "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env (copy .env.example first).",
  );
  process.exit(1);
}
const r = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
  method: "POST",
  signal: AbortSignal.timeout(12000),
  headers: {
    Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: "grant_type=client_credentials",
});
const data = await r.json().catch(() => ({}));
if (!r.ok) {
  console.error(
    `PayPal sandbox rejected these credentials (HTTP ${r.status}${data.error ? `: ${data.error}` : ""}).`,
  );
  console.error(
    "Use the Sandbox (not Live) client ID and secret from developer.paypal.com → Apps & Credentials.",
  );
  process.exit(1);
}
const scopes = String(data.scope || "").split(" ");
const authCapture = scopes.some((s) => s.endsWith("/payment/authcapture"));
console.log(
  `PayPal sandbox credentials OK · app ${data.app_id || "(id hidden)"}`,
);
console.log(
  authCapture
    ? "Authorize/capture permission present."
    : "Warning: authorize/capture scope not listed; check the app's Accept payments feature.",
);
