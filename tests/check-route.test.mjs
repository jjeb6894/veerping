import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, afterEach } from 'node:test';

// Run after npm run build: exercise the compiled Next route rather than a parallel parser path.
const { default: app } = await import('../.next/server/app/api/check/route.js');
const post = app.routeModule.userland.POST;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const request = url => new Request('http://localhost/api/check', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }),
});

test('AutoTrader fields reach the report API without renaming or dropping them', async () => {
  const html = await readFile(new URL('./fixtures/autotrader-us.html', import.meta.url), 'utf8');
  globalThis.fetch = async () => new Response(html, { headers: { 'content-type': 'text/html' } });
  const response = await post(request('https://www.autotrader.com/cars-for-sale/vehicle/793071633'));
  const report = await response.json();
  assert.equal(response.status, 200);
  assert.equal(report.platformId, 'autotrader');
  assert.equal(report.listing.title, '2022 Honda Civic EX');
  assert.equal(report.listing.price, '$24,995');
  assert.equal(report.listing.mileage, '18,342 miles');
  assert.equal(report.listing.seller, 'Example Honda');
  assert.equal(report.listing.location, 'Austin, TX');
  assert.equal(report.photoUrl, 'https://images.example.test/civic.jpg');
});

test('other adapters keep their existing report path', async () => {
  globalThis.fetch = async () => { throw Error('No external fetch expected'); };
  const report = await (await post(request('https://www.ebay.com/itm/123456'))).json();
  assert.equal(report.platformId, 'ebay');
  assert.equal(report.listing, undefined);
  assert.ok(report.checks.length);
});
