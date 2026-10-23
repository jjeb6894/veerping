import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerName, buyerMessage, privatePhone, redactContact } from "../lib/checkup-contact.ts";

test("automatic buyer message uses a valid name without accepting contact in the name", () => {
  assert.equal(buyerMessage(buyerName(" Amina ")), "Hi, I’m Amina. Is this vehicle still available? Please let me know and contact me on WhatsApp.");
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
