import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerName, buyerMessage, privatePhone, redactContact } from "../lib/checkup-contact.ts";

test("viewing message is consistent and contains no name or contact detail", () => {
  assert.equal(buyerMessage(), "Hi, I’m interested in viewing this vehicle. Is it still available, and when could I come to see it? Please reply through my request page.");
  assert.equal(buyerMessage(), buyerMessage());
  assert.doesNotMatch(buyerMessage(), /whatsapp|\+\d|\b\d{7,}\b/i);
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
