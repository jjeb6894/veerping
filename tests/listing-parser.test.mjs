import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, afterEach } from 'node:test';
import { fetchAutoTraderListing, parseVehicleListing } from '../lib/listing-parser.ts';

const url = 'https://www.autotrader.com/cars-for-sale/vehicle/793071633?clickType=goodgreatprice';
const fixture = async name => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const diagnostics = () => ({ requestedUrl: url, javascriptRenderingUsed: false });
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('US Vehicle JSON-LD fills report fields and provenance', async () => {
  const listing = parseVehicleListing(await fixture('autotrader-us.html'), url, diagnostics());
  assert.equal(listing.sourceStatus, 'extracted');
  assert.equal(listing.title, '2022 Honda Civic EX');
  assert.deepEqual([listing.year, listing.make, listing.model, listing.trim], ['2022', 'Honda', 'Civic', 'EX']);
  assert.equal(listing.price, '$24,995');
  assert.equal(listing.mileage, '18,342 miles');
  assert.equal(listing.seller, 'Example Honda');
  assert.equal(listing.location, 'Austin, TX');
  assert.equal(listing.vin, '2HGFE1F70NH123456');
  assert.deepEqual(listing.images, ['https://images.example.test/civic.jpg']);
  assert.equal(listing.listingUrl, url);
  assert.equal(listing.diagnostics.vehicleSchemaFound, true);
  assert.equal(listing.diagnostics.fieldSources.seller, 'json-ld');
});

test('embedded state provides details without JSON-LD and optional image/rating', async () => {
  const listing = parseVehicleListing(await fixture('autotrader-state.html'), url, diagnostics());
  assert.equal(listing.sourceStatus, 'extracted');
  assert.equal(listing.price, '$21,900');
  assert.equal(listing.mileage, '30,210 miles');
  assert.equal(listing.seller, 'Example Motors');
  assert.equal(listing.location, 'Dallas, TX');
  assert.equal(listing.sellerRating, undefined);
  assert.deepEqual(listing.images, []);
  assert.equal(listing.diagnostics.fieldSources.title, 'embedded-state');
});

test('malformed structured data is distinct from a JS-only shell', () => {
  const malformed = '<title>Vehicle</title><script type="application/ld+json">{bad</script>';
  assert.equal(parseVehicleListing(malformed, url, diagnostics()).sourceStatus, 'parser_failed');
  assert.equal(parseVehicleListing('<div id="__next"></div><script src="/app.js"></script>', url, diagnostics()).sourceStatus, 'javascript_required');
});

test('HTTP 200 Akamai block is not mistaken for listing data', async () => {
  const html = await fixture('autotrader-block.html');
  globalThis.fetch = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html', server: 'AkamaiNetStorage' } });
  const listing = await fetchAutoTraderListing(url);
  assert.equal(listing.sourceStatus, 'blocked');
  assert.equal(listing.diagnostics.httpStatus, 200);
  assert.equal(listing.diagnostics.responseBytes, Buffer.byteLength(html));
  assert.equal(listing.diagnostics.challengeDetected, true);
});

test('removed, unsupported, and empty pages have distinct outcomes', async () => {
  globalThis.fetch = async () => new Response('', { status: 410 });
  assert.equal((await fetchAutoTraderListing(url)).sourceStatus, 'removed');
  assert.equal((await fetchAutoTraderListing('https://example.com/cars-for-sale/vehicle/123')).sourceStatus, 'unsupported');
  assert.equal(parseVehicleListing('<title>Cars</title>', url, diagnostics()).sourceStatus, 'required_data_unavailable');
});

test('UK structured listing remains supported and no network call is made for unsupported paths', async () => {
  const uk = 'https://www.autotrader.co.uk/car-details/123456789';
  globalThis.fetch = async () => new Response('<script type="application/ld+json">{"@type":"Car","name":"2020 Mini Cooper","offers":{"price":11000,"priceCurrency":"GBP"}}</script>');
  const listing = await fetchAutoTraderListing(uk);
  assert.equal(listing.sourceStatus, 'extracted');
  assert.equal(listing.price, '£11,000');
  globalThis.fetch = async () => { throw Error('should not fetch'); };
  assert.equal((await fetchAutoTraderListing('https://www.autotrader.com/')).sourceStatus, 'unsupported');
});
