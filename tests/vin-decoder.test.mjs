import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { decodeVin } from '../lib/vin-decoder.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('invalid VIN is rejected without contacting the provider', async () => {
  globalThis.fetch = () => { throw new Error('should not be called'); };
  assert.deepEqual(await decodeVin('not-a-vin'), { status: 'invalid' });
});

test('decoder returns the provider fields without treating them as a history check', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ Results: [{ Make: 'BMW', Model: 'X3', ModelYear: '2021' }] }));
  assert.deepEqual(await decodeVin('5UXTR9C53M9E12345'), { status: 'decoded', make: 'BMW', model: 'X3', year: '2021' });
});

test('missing or failed results are marked unavailable', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ Results: [{}] }));
  assert.deepEqual(await decodeVin('5UXTR9C53M9E12345'), { status: 'unavailable' });
  globalThis.fetch = async () => { throw new Error('network'); };
  assert.deepEqual(await decodeVin('5UXTR9C53M9E12345'), { status: 'unavailable' });
});
