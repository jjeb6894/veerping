import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUkAutotraderList } from "../lib/autotrader-list.ts";

test("only distinct AutoTrader UK vehicle links enter the chosen list", () => {
  const uk = "https://www.autotrader.co.uk/car-details/123456789";
  assert.deepEqual(parseUkAutotraderList([uk, uk, "https://evil.example/car-details/123", "http://www.autotrader.co.uk/car-details/123", "https://www.autotrader.co.uk/profile"].join("\n")), [uk]);
});
