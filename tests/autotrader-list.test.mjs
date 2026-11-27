import assert from "node:assert/strict";
import { test } from "node:test";
import { isUkAutotraderAssetUrl, parseUkAutotraderList } from "../lib/autotrader-list.ts";

test("only distinct AutoTrader UK vehicle links enter the chosen list", () => {
  const uk = "https://www.autotrader.co.uk/car-details/123456789";
  assert.deepEqual(parseUkAutotraderList([uk, uk, "https://evil.example/car-details/123", "http://www.autotrader.co.uk/car-details/123", "https://www.autotrader.co.uk/profile"].join("\n")), [uk]);
});

test("seller-page images only load from HTTPS AutoTrader asset hosts", () => {
  assert.equal(isUkAutotraderAssetUrl("https://m.atcdn.co.uk/a/media/car.jpg"), true);
  assert.equal(isUkAutotraderAssetUrl("https://images.autotrader.co.uk/car.jpg"), true);
  assert.equal(isUkAutotraderAssetUrl("https://evil.example/tracker.jpg"), false);
  assert.equal(isUkAutotraderAssetUrl("http://m.atcdn.co.uk/car.jpg"), false);
  assert.equal(isUkAutotraderAssetUrl("https://autotrader.co.uk.evil.example/car.jpg"), false);
  assert.equal(isUkAutotraderAssetUrl("https://user@atcdn.co.uk/car.jpg"), false);
});
