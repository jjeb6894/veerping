import assert from "node:assert/strict";
import { test } from "node:test";

const { default: requestApp } = await import("../.next/server/app/api/checkup-requests/[id]/route.js");
const { default: checkoutApp } = await import("../.next/server/app/api/checkup-requests/[id]/checkout/route.js");
const { default: confirmApp } = await import("../.next/server/app/api/checkup-requests/[id]/confirm/route.js");
const { default: checkApp } = await import("../.next/server/app/api/check/route.js");
const ctx = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };

test("forged status changes require an access token and cannot reach storage", async () => {
  const response = await requestApp.routeModule.userland.PATCH(new Request("http://localhost/api/checkup-requests/11111111-1111-4111-8111-111111111111", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paidBy: "buyer", checkupStatus: "completed", stripeSessionId: "cs_fake" }),
  }), ctx);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});
test("private details and payment confirmation require access tokens", async () => {
  const url = "http://localhost/api/checkup-requests/11111111-1111-4111-8111-111111111111";
  assert.equal((await requestApp.routeModule.userland.GET(new Request(url), ctx)).status, 403);
  assert.equal((await checkoutApp.routeModule.userland.POST(new Request(url + "/checkout", { method: "POST" }), ctx)).status, 403);
  assert.equal((await confirmApp.routeModule.userland.POST(new Request(url + "/confirm", { method: "POST", body: JSON.stringify({ sessionId: "cs_unrelated" }) }), ctx)).status, 403);
});

test("AutoTrader previews do not fetch listing content or fabricate scores", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected AutoTrader network request"); };
  try {
    const response = await checkApp.routeModule.userland.POST(new Request("http://localhost/api/check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://www.autotrader.co.uk/car-details/123456789" }),
    }));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.score, null);
    assert.deepEqual(result.checks, []);
    assert.equal(result.listing, undefined);
    assert.equal(result.photoUrl, undefined);
  } finally { globalThis.fetch = originalFetch; }
});
