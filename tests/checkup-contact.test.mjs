import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerName, buyerMessage, privatePhone, redactContact } from "../lib/checkup-contact.ts";

test("viewing messages vary naturally without a name or contact detail", () => {
  assert.equal(buyerMessage(), "Hi, I’m interested in viewing this vehicle. Is it still available, and when could I come to see it? Please reply through my request page.");
  assert.equal(buyerMessage("request-1"), buyerMessage("request-1"));
  const variants = new Set(["request-1", "request-2", "request-3", "request-4", "request-5"].map(buyerMessage));
  assert.ok(variants.size > 1);
  for (const message of variants) {
    assert.doesNotMatch(message, /whatsapp|\+\d|\b\d{7,}\b/i);
  }
  for (const name of ["Amina +44 7700 900123", "Amina wa.me/447700900123", "Amina seven seven zero zero"]) {
    assert.throws(() => buyerName(name));
  }
});
test("international numbers are validated and masked; legacy text is redacted", () => {
  const gb = privatePhone("GB", "07123 456789");
  assert.equal(gb.masked, "+44 712 ••• ••••");
  assert.equal(gb.full, "+447123456789");
  assert.equal(privatePhone("US", "202 555 0123").masked, "+1 202 ••• ••••");
  assert.throws(() => privatePhone("GB", "123"));
  assert.equal(redactContact("Call +44 7700 900123 or wa.me/447700900123"), "Call [contact hidden] or [contact hidden]");
});
