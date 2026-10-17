import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanEnteredListing, suggestListingDetails } from '../lib/listing-input.ts';

test('copied visible listing text suggests editable vehicle details', () => {
  const result = suggestListingDetails(`Cars for Sale\n2022 Honda Civic EX\n$24,995\n18,342 miles\nDealer: Example Honda\nLocation: Austin, TX\nVIN 2HGFE1F70NH123456`);
  assert.deepEqual(result, {
    title: '2022 Honda Civic EX', price: '$24,995', mileage: '18,342 miles',
    seller: 'Example Honda', location: 'Austin, TX', vin: '2HGFE1F70NH123456',
  });
});

test('saved details accept only bounded known text fields', () => {
  assert.deepEqual(cleanEnteredListing({ title: ' Car ', price: 25000, seller: 'A'.repeat(200), token: 'secret' }),
    { title: 'Car', seller: 'A'.repeat(160) });
  assert.deepEqual(cleanEnteredListing(null), {});
});

test('copied UK listing text suggests pound prices and mileage', () => {
  assert.deepEqual(suggestListingDetails('2021 BMW X3\n£32,405\n55,316 miles'), {
    title: '2021 BMW X3', price: '£32,405', mileage: '55,316 miles',
  });
});

