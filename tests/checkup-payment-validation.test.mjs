import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesCheckupPayment } from "../lib/checkup-payment-validation.ts";

const attempt = { id: "attempt-1", request_id: "request-1", payer: "seller", stripe_session_id: "cs_valid", price_id: "price_checkup", product_id: "prod_checkup", amount: 999, currency: "gbp", livemode: false };
const session = { id: "cs_valid", client_reference_id: "request-1", metadata: { attemptId: "attempt-1", product: "tcl-vehicle-checkup", checkupRequestId: "request-1", paidBy: "seller" }, mode: "payment", payment_status: "paid", amount_total: 999, currency: "gbp", livemode: false, line_items: { data: [{ price: { id: "price_checkup", product: "prod_checkup" }, quantity: 1 }] } };

test("only paid checkout for the exact request, payer, product, amount and currency unlocks contact", () => {
  assert.equal(matchesCheckupPayment(session, attempt), true);
  for (const changed of [
    { payment_status: "unpaid" }, { payment_status: "no_payment_required" },
    { id: "cs_unrelated" }, { client_reference_id: "request-other" },
    { metadata: { ...session.metadata, paidBy: "buyer" } },
    { metadata: { ...session.metadata, product: "vehicle-report-unlock" } },
    { amount_total: 998 }, { currency: "usd" }, { livemode: true },
    { line_items: { data: [{ price: { id: "price_other", product: "prod_checkup" }, quantity: 1 }] } },
  ]) assert.equal(matchesCheckupPayment({ ...session, ...changed }, attempt), false);
});
