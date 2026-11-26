import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeVehicleDetails } from "../lib/ollama-vehicle.ts";

test("Ollama normalization accepts only values supported by listing facts", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ response: JSON.stringify({ make: "Ford", model: "Focus", year: "2021", price: "£12,995" }) }), { status: 200 });
  try {
    assert.deepEqual(await normalizeVehicleDetails({ title: "2021 Ford Focus Titanium", price: "£12,995", summary: "18,000 miles" }), {
      title: "2021 Ford Focus", price: "£12,995", summary: "2021 Ford Focus · 18,000 miles",
    });
  } finally { globalThis.fetch = originalFetch; }
});

test("unavailable or unsupported Ollama output preserves source details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ response: JSON.stringify({ make: "Ferrari", model: "F40", year: "2020", price: "£1" }) }), { status: 200 });
  try {
    const original = { title: "2021 Ford Focus", price: "£12,995", summary: "18,000 miles" };
    assert.deepEqual(await normalizeVehicleDetails(original), original);
    globalThis.fetch = async () => { throw new Error("Ollama offline"); };
    assert.deepEqual(await normalizeVehicleDetails(original), original);
  } finally { globalThis.fetch = originalFetch; }
});
