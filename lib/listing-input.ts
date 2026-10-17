/** A local-only fallback for pages that reject server fetches. Values require user review. */
export type EnteredListing = {
  title?: string;
  price?: string;
  mileage?: string;
  seller?: string;
  location?: string;
  vin?: string;
};

export const ENTERED_FIELDS: (keyof EnteredListing)[] = ["title", "price", "mileage", "seller", "location", "vin"];

export function cleanEnteredListing(value: unknown): EnteredListing {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: EnteredListing = {};
  for (const field of ENTERED_FIELDS) {
    const text = source[field];
    if (typeof text === "string" && text.trim()) result[field] = text.trim().slice(0, 160);
  }
  return result;
}

/** Suggest fields from copied visible text. Never publish these guesses without review. */
export function suggestListingDetails(input: string): EnteredListing {
  const lines = input.slice(0, 100_000).split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const title = lines.find(line => /^(?:(?:new|used|certified)\s+)?(?:19|20)\d{2}\s+[A-Z][\w-]+\s+[\w-]+/i.test(line) && line.length <= 100);
  const price = lines.find(line => /^[£$€]\s*\d[\d,]*(?:\.\d{2})?$/.test(line)) ??
    lines.find(line => /\bprice\s*:?\s*[£$€]\s*\d[\d,]*/i.test(line));
  const mileage = lines.find(line => /\b\d[\d,]*\s*(?:miles?|mi|km)\b/i.test(line));
  const labeled = (label: string) => lines.find(line => new RegExp(`^(?:${label})\\s*:\\s*\\S`, "i").test(line))
    ?.replace(new RegExp(`^(?:${label})\\s*:\\s*`, "i"), "");
  const seller = labeled("dealer|seller|sold by");
  const location = labeled("location|dealer location");
  const vin = input.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0];
  return cleanEnteredListing({
    title, price: price?.match(/[£$€]\s*\d[\d,]*(?:\.\d{2})?/)?.[0],
    mileage: mileage?.match(/\b\d[\d,]*\s*(?:miles?|mi|km)\b/i)?.[0],
    seller, location, vin,
  });
}

