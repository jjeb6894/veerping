import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { once } from "node:events";
import crypto from "node:crypto";
import { test } from "node:test";

// Run after npm run build: exercise the compiled Next routes rather than a
// parallel copy of the payment logic.
const { default: checkoutApp } = await import("../.next/server/app/api/stripe/checkout/route.js");
const { default: sessionApp } = await import("../.next/server/app/api/stripe/session/route.js");
const { default: webhookApp } = await import("../.next/server/app/api/stripe/webhook/route.js");
const checkout = checkoutApp.routeModule.userland.POST;
const sessionStatus = sessionApp.routeModule.userland.GET;
const webhook = webhookApp.routeModule.userland.POST;

const USD_PRICE = process.env.STRIPE_PRICE_ONE_OFF_USD ?? "price_1UPgSy0sal1TIs1TeLoZ9Iib";
const GBP_PRICE = "price_test_GBP9_99";
const GBP_FALLBACK = "price_1UPgSc0sal1TIs1TaOjvkfpP";

// --- Local mock Stripe API --------------------------------------------------
const createdSessions = new Map();
let sessionCounter = 0;
const stripeApi = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const respond = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    const retrieve = req.url.match(/^\/v1\/checkout\/sessions\/(cs_[^/?]+)/);
    if (req.method === "POST" && req.url === "/v1/checkout/sessions") {
      const params = new URLSearchParams(body);
      const priceId = params.get("line_items[0][price]");
      const metadata = {};
      for (const [key, value] of params) {
        if (key.startsWith("metadata[")) metadata[key.slice(9, -1)] = value;
      }
      const currency = priceId === GBP_PRICE || priceId === GBP_FALLBACK ? "gbp" : "usd";
      const id = `cs_test_${++sessionCounter}`;
      const session = {
        id,
        object: "checkout.session",
        mode: params.get("mode"),
        url: `https://checkout.stripe.test/c/pay/${id}`,
        payment_status: "unpaid",
        currency,
        amount_total: 999,
        metadata,
        line_items: { data: [{ price: { id: priceId, currency }, quantity: Number(params.get("line_items[0][quantity]")) }] },
      };
      createdSessions.set(id, session);
      return respond(200, session);
    }
    if (req.method === "GET" && retrieve) {
      const session = createdSessions.get(retrieve[1]);
      if (!session) return respond(404, { error: { message: `No such checkout session: ${retrieve[1]}` } });
      return respond(200, session);
    }
    respond(404, { error: { message: `Unexpected route ${req.method} ${req.url}` } });
  });
});
stripeApi.listen(0, "127.0.0.1");
await once(stripeApi, "listening");
const stripePort = stripeApi.address().port;

// The compiled Stripe SDK's Node client calls https.request({ host:
// "api.stripe.com", ... }) and, believing it is on TLS, waits for the
// socket's 'secureConnect' event before writing the request body. Redirect
// those calls to the local plain-HTTP mock and bridge 'connect' to
// 'secureConnect' so the SDK's write flow completes.
const realHttpsRequest = https.request;
https.request = function patchedStripeRequest(options, callback, ...rest) {
  if (options && typeof options === "object" && options.host === "api.stripe.com") {
    const { agent, ciphers, ...clean } = options;
    const redirected = http.request.call(
      https,
      { ...clean, host: "127.0.0.1", port: stripePort },
      callback,
      ...rest,
    );
    redirected.once("socket", (socket) => {
      if (socket.connecting) socket.once("connect", () => socket.emit("secureConnect"));
    });
    return redirected;
  }
  return realHttpsRequest.call(https, options, callback, ...rest);
};
process.env.STRIPE_SECRET_KEY = `sk_test_mock_${stripePort}`;
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

test.after(async () => {
  https.request = realHttpsRequest;
  stripeApi.close();
});

const postCheckout = (payload) => checkout(new Request("http://localhost/api/stripe/checkout", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
}));
const listingUrl = "https://www.autotrader.co.uk/car-details/20261";
const lastSession = () => [...createdSessions.values()].at(-1);

test("invalid plan rejected without reaching Stripe", async () => {
  const response = await postCheckout({ plan: "gold-plated", currency: "USD" });
  assert.equal(response.status, 400);
  assert.equal(createdSessions.size, 0);
});

test("checkout session created with the right price, product metadata and listing URL", async () => {
  const response = await postCheckout({ plan: "one-off-check", currency: "USD", url: listingUrl });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.match(data.url, /^https:\/\/checkout\.stripe\.test\//);
  const created = lastSession();
  assert.equal(created.line_items.data[0].price.id, USD_PRICE);
  assert.equal(created.line_items.data[0].quantity, 1);
  assert.equal(created.mode, "payment");
  assert.equal(created.metadata.product, "vehicle-report-unlock");
  assert.equal(created.metadata.plan, "one-off-check");
  assert.equal(created.metadata.listingUrl, listingUrl);
});

test("currency routing selects the GBP price for GBP checkout", async () => {
  delete process.env.STRIPE_PRICE_ONE_OFF_GBP;
  const response = await postCheckout({ plan: "one-off-check", currency: "GBP", url: listingUrl });
  await response.json();
  assert.equal(lastSession().line_items.data[0].price.id, GBP_FALLBACK);
  assert.equal(lastSession().currency, "gbp");
  process.env.STRIPE_PRICE_ONE_OFF_GBP = GBP_PRICE;
});

test("unpaid session reports paid=false", async () => {
  const id = lastSession().id;
  const response = await sessionStatus(new Request(`http://localhost/api/stripe/session?session_id=${id}`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.paid, false);
});

test("paid session is confirmed with amount and currency", async () => {
  const id = lastSession().id;
  const session = createdSessions.get(id);
  session.payment_status = "paid";
  const response = await sessionStatus(
    new Request(`http://localhost/api/stripe/session?session_id=${id}&url=${encodeURIComponent(session.metadata.listingUrl)}`),
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.paid, true);
  assert.equal(payload.amountTotal, 999);
  assert.equal(payload.currency, "GBP");
});

test("session paid for a different listing stays locked", async () => {
  const id = lastSession().id;
  const otherUrl = "https://www.autotrader.co.uk/car-details/OTHER";
  const response = await sessionStatus(
    new Request(`http://localhost/api/stripe/session?session_id=${id}&url=${encodeURIComponent(otherUrl)}`),
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.paid, false);
});

test("signed checkout.session.completed webhook is accepted", async () => {
  const paidId = [...createdSessions.keys()].at(-1);
  const event = {
    id: `evt_test_${crypto.randomUUID()}`,
    object: "event",
    api_version: "2026-10-19.acacia",
    type: "checkout.session.completed",
    data: { object: { ...createdSessions.get(paidId) } },
  };
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`).digest("hex");
  const response = await webhook(new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.received, true);
  assert.equal(data.eventType, "checkout.session.completed");
});

test("tampered webhook signature is rejected", async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await webhook(new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${"0".repeat(64)}`,
    },
    body: JSON.stringify({ id: "evt_bad", type: "checkout.session.completed", data: { object: {} } }),
  }));
  assert.equal(response.status, 400);
});
