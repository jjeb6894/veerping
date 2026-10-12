import type { ListingSnapshot } from "@/types";

const MAX_HTML_BYTES = 4_000_000;
const MAX_IMAGES = 8;

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;|&#47;/gi, "/")
    .trim();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = decodeHtml(String(value)).replace(/\s+/g, " ").trim();
  return text || undefined;
}

function readAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of tag.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function metaValue(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = readAttributes(tag);
    if (attrs.property?.toLowerCase() === key.toLowerCase() || attrs.name?.toLowerCase() === key.toLowerCase()) {
      return cleanText(attrs.content);
    }
  }
  return undefined;
}

function absoluteUrl(value: unknown, pageUrl: URL): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  try {
    const url = new URL(text, pageUrl);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function imageValues(value: unknown, pageUrl: URL): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object" && "url" in item) return [(item as { url?: unknown }).url];
      return [];
    })
    .map((item) => absoluteUrl(item, pageUrl))
    .filter((item): item is string => Boolean(item));
}

function firstNumber(value: unknown): number | undefined {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function currencySymbol(currency: string | undefined): string {
  switch (currency?.toUpperCase()) {
    case "GBP":
      return "£";
    case "EUR":
      return "€";
    case "USD":
      return "$";
    default:
      return currency ? currency.toUpperCase() + " " : "";
  }
}

function formatPrice(value: unknown, currency: unknown): string | undefined {
  const number = firstNumber(value);
  if (number === undefined) return cleanText(value);
  const symbol = currencySymbol(cleanText(currency));
  return symbol + number.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

function formatMileage(value: unknown, unit: unknown): string | undefined {
  const number = firstNumber(value);
  if (number === undefined) return cleanText(value);
  const normalizedUnit = cleanText(unit)?.toLowerCase();
  return number.toLocaleString("en-GB") + " " + (normalizedUnit?.includes("km") ? "km" : "miles");
}

function formatSellerRating(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return cleanText(value);
  const record = value as Record<string, unknown>;
  const rating = cleanText(record.ratingValue ?? record.value);
  if (!rating) return undefined;
  const best = cleanText(record.bestRating);
  const count = cleanText(record.reviewCount ?? record.ratingCount);
  return [best ? `${rating}/${best}` : rating, count ? `${count} ratings` : undefined]
    .filter(Boolean)
    .join(" · ");
}

function jsonLdDocuments(html: string): unknown[] {
  const documents: unknown[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      documents.push(JSON.parse(match[1].trim()));
    } catch {
      // Some listing pages include malformed or partial JSON-LD. Use other metadata.
    }
  }
  return documents;
}

function flattenedDocuments(value: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const visit = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    const record = item as Record<string, unknown>;
    found.push(record);
    Object.values(record).forEach(visit);
  };
  visit(value);
  return found;
}

function typeIncludes(record: Record<string, unknown>, wanted: string): boolean {
  const type = record["@type"];
  return (Array.isArray(type) ? type : [type]).some(
    (entry) => typeof entry === "string" && entry.toLowerCase().includes(wanted.toLowerCase())
  );
}

function textFromRecord(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return cleanText(value);
  const record = value as Record<string, unknown>;
  return cleanText(record[key]) ?? cleanText(record.name) ?? cleanText(record["@id"]);
}

/**
 * Best-effort extraction for public AutoTrader UK pages. It uses the page's
 * JSON-LD and OpenGraph metadata and never bypasses access controls.
 */
export async function fetchAutoTraderUkListing(listingUrl: string): Promise<ListingSnapshot> {
  let pageUrl: URL;
  try {
    pageUrl = new URL(listingUrl);
  } catch {
    return { sourceStatus: "unavailable", sourceMessage: "The listing URL is not valid." };
  }

  const host = pageUrl.hostname.toLowerCase();
  if (host !== "autotrader.co.uk" && !host.endsWith(".autotrader.co.uk")) {
    return {
      sourceStatus: "unavailable",
      sourceMessage: "The live extractor currently supports AutoTrader UK links.",
    };
  }

  let response: Response;
  try {
    response = await fetch(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "TemplateChecklist listing preview",
      },
      redirect: "follow",
    });
  } catch {
    return { sourceStatus: "unavailable", sourceMessage: "AutoTrader could not be reached from the report server." };
  }

  if (response.status === 401 || response.status === 403 || response.status === 429) {
    return {
      sourceStatus: "blocked",
      sourceMessage: "AutoTrader did not allow this page to be read. Paste a public listing link or try again later.",
    };
  }
  if (!response.ok) {
    return {
      sourceStatus: "unavailable",
      sourceMessage: `AutoTrader returned an error (HTTP ${response.status}).`,
    };
  }

  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_HTML_BYTES) {
    return { sourceStatus: "unavailable", sourceMessage: "The listing page is larger than the preview limit." };
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_HTML_BYTES) {
    return { sourceStatus: "unavailable", sourceMessage: "The listing page is larger than the preview limit." };
  }
  const html = new TextDecoder().decode(bytes);
  const documents = jsonLdDocuments(html);
  const records = documents.flatMap(flattenedDocuments);
  const listingRecord =
    records.find((record) => typeIncludes(record, "vehicle")) ??
    records.find((record) => typeIncludes(record, "car")) ??
    records.find((record) => typeIncludes(record, "product")) ??
    records[0];

  const offers = listingRecord?.offers && typeof listingRecord.offers === "object"
    ? listingRecord.offers as Record<string, unknown>
    : undefined;
  const mileage = listingRecord?.mileageFromOdometer;
  const mileageRecord = mileage && typeof mileage === "object" ? mileage as Record<string, unknown> : undefined;
  const seller = listingRecord?.seller ?? listingRecord?.brand;
  const sellerRecord = seller && typeof seller === "object" ? seller as Record<string, unknown> : undefined;
  const address = sellerRecord?.address && typeof sellerRecord.address === "object"
    ? sellerRecord.address as Record<string, unknown>
    : undefined;

  const images = [
    ...imageValues(listingRecord?.image, pageUrl),
    ...imageValues(metaValue(html, "og:image"), pageUrl),
    ...imageValues(metaValue(html, "twitter:image"), pageUrl),
  ].filter((value, index, all) => all.indexOf(value) === index).slice(0, MAX_IMAGES);

  const title =
    textFromRecord(listingRecord, "name") ??
    metaValue(html, "og:title") ??
    metaValue(html, "twitter:title") ??
    cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);

  const price =
    formatPrice(offers?.price ?? listingRecord?.price, offers?.priceCurrency ?? listingRecord?.priceCurrency) ??
    formatPrice(metaValue(html, "product:price:amount"), metaValue(html, "product:price:currency"));
  const mileageText =
    formatMileage(mileageRecord?.value ?? listingRecord?.mileage, mileageRecord?.unitCode ?? mileageRecord?.unitText) ??
    cleanText(html.match(/\b([\d,]+)\s*(miles|mi|km)\b/i)?.[0]);
  const sellerName =
    textFromRecord(seller, "name") ??
    metaValue(html, "author");
  const sellerRating = formatSellerRating(
    sellerRecord?.aggregateRating ?? listingRecord?.aggregateRating,
  );
  const location =
    cleanText(address?.addressLocality) ??
    cleanText(address?.addressRegion) ??
    metaValue(html, "geo.placename");

  const listing: ListingSnapshot = {
    title,
    price,
    mileage: mileageText,
    seller: sellerName,
    sellerRating,
    location,
    images,
    sourceStatus: title || price || mileageText || sellerName || location || images.length
      ? "extracted"
      : "unavailable",
  };

  if (listing.sourceStatus === "unavailable") {
    listing.sourceMessage = "The page loaded, but its listing details were not exposed in readable metadata.";
  }
  return listing;
}

