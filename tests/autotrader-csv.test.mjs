import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAutoTraderCsv } from "../lib/autotrader-list.ts";

test("reads only the url column, deduplicates, and rejects search filters", () => {
  const csv = [
    "title,url,notes",
    '"A car, with comma",https://www.autotrader.co.uk/car-details/123456789,"https://evil.example/must-not-be-used"',
    '"Same car",https://www.autotrader.co.uk/car-details/123456789,duplicate',
    '"Search",https://www.autotrader.co.uk/car-search?make=BMW,filter',
    '"Bad host",https://autotrader.co.uk.evil.example/car-details/123,invalid',
  ].join("\r\n");

  assert.deepEqual(parseAutoTraderCsv(csv), {
    urls: ["https://www.autotrader.co.uk/car-details/123456789"],
    duplicates: 1,
    unsupported: 2,
  });
});

test("requires the declared url column and rejects malformed quoting", () => {
  assert.throws(() => parseAutoTraderCsv("listing\nhttps://www.autotrader.co.uk/car-details/123"), /url.*column/i);
  assert.throws(() => parseAutoTraderCsv('url\n"https://www.autotrader.co.uk/car-details/123'), /unclosed quoted/i);
});

test("handles a UTF-8 BOM, case-insensitive header, and empty rows", () => {
  assert.deepEqual(parseAutoTraderCsv('\uFEFFURL\r\nhttps://www.autotrader.co.uk/car-details/123456789\r\n\r\n'), {
    urls: ["https://www.autotrader.co.uk/car-details/123456789"],
    duplicates: 0,
    unsupported: 0,
  });
});
