import type { ListingDiagnostics, ListingSnapshot } from "@/types";

const MAX_HTML_BYTES = 4_000_000;
const MAX_IMAGES = 8;
const VEHICLE_TYPES = ["vehicle", "car", "product"];

type RecordValue = Record<string, unknown>;
const asRecord = (value: unknown): RecordValue | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
const first = (value: unknown): unknown => Array.isArray(value) ? value[0] : value;

function decodeHtml(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&#x2F;|&#47;/gi, "/").trim();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  return decodeHtml(String(value)).replace(/\s+/g, " ").trim() || undefined;
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function metaValue(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = attributes(tag);
    if (attr.property?.toLowerCase() === key || attr.name?.toLowerCase() === key) return cleanText(attr.content);
  }
  return undefined;
}

function absoluteUrl(value: unknown, pageUrl: URL): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  try {
    const url = new URL(text, pageUrl);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch { return undefined; }
}

function images(value: unknown, pageUrl: URL): string[] {
  return (Array.isArray(value) ? value : [value]).flatMap(item => {
    const url = absoluteUrl(asRecord(item)?.url ?? item, pageUrl);
    return url ? [url] : [];
  });
}

function firstNumber(value: unknown): number | undefined {
  const match = String(value ?? "").replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function formatPrice(value: unknown, currency: unknown): string | undefined {
  const number = firstNumber(value);
  if (number === undefined) return undefined;
  const unit = cleanText(currency)?.toUpperCase();
  const symbol = unit === "GBP" ? "£" : unit === "EUR" ? "€" : unit === "USD" ? "$" : unit ? `${unit} ` : "$";
  return symbol + number.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatMileage(value: unknown, unit: unknown): string | undefined {
  const number = firstNumber(value);
  if (number === undefined) return undefined;
  const normalized = (cleanText(unit) ?? cleanText(value)?.match(/\b(?:km|kilometres?|mi|miles?)\b/i)?.[0])?.toLowerCase();
  return number.toLocaleString("en-US") + " " + (normalized?.includes("km") || normalized === "kmt" ? "km" : "miles");
}

function formatRating(value: unknown): string | undefined {
  const rating = asRecord(value);
  const score = cleanText(rating?.ratingValue ?? rating?.value ?? value);
  if (!score) return undefined;
  const best = cleanText(rating?.bestRating);
  const count = cleanText(rating?.reviewCount ?? rating?.ratingCount);
  return [best ? `${score}/${best}` : score, count ? `${count} ratings` : undefined].filter(Boolean).join(" · ");
}

function recordText(value: unknown, key = "name"): string | undefined {
  return cleanText(asRecord(value)?.[key] ?? asRecord(value)?.name ?? value);
}

function records(value: unknown, limit = 2000): RecordValue[] {
  const found: RecordValue[] = [];
  const visit = (item: unknown, depth: number) => {
    if (depth > 15 || found.length >= limit) return;
    if (Array.isArray(item)) { item.forEach(part => visit(part, depth + 1)); return; }
    const record = asRecord(item);
    if (!record) return;
    found.push(record);
    Object.values(record).forEach(part => visit(part, depth + 1));
  };
  visit(value, 0);
  return found;
}

function hasType(record: RecordValue, types: string[]): boolean {
  const value = record["@type"];
  return (Array.isArray(value) ? value : [value]).some(type =>
    typeof type === "string" && types.some(wanted => type.toLowerCase().split("/").pop() === wanted));
}

function jsonScripts(html: string): { jsonLd: unknown[]; state: unknown[]; found: boolean; malformed: boolean } {
  const jsonLd: unknown[] = [], state: unknown[] = [];
  let found = false, malformed = false;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attr = attributes(match[1]);
    const type = attr.type?.toLowerCase();
    const ld = type === "application/ld+json";
    const pageState = attr.id === "__NEXT_DATA__" || (type === "application/json" && Boolean(attr.id));
    if (!ld && !pageState) continue;
    if (ld) found = true;
    try { (ld ? jsonLd : state).push(JSON.parse(match[2].trim())); }
    catch { malformed = true; }
  }
  return { jsonLd, state, found, malformed };
}

function pageTitle(html: string): string | undefined {
  return cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function isChallenge(html: string, title?: string): boolean {
  const sample = html.slice(0, 100_000);
  return /\/akamai-block\/|verify you are human|checking your browser|unusual traffic|access denied/i.test(sample) ||
    /page unavailable|captcha|access denied/i.test(title ?? "") &&
      /incident number|captcha|unavailable|access denied/i.test(sample);
}

function locationOf(value: unknown): string | undefined {
  const address = asRecord(value);
  if (!address) return cleanText(value);
  const city = cleanText(address.addressLocality ?? address.city);
  const region = cleanText(address.addressRegion ?? address.state);
  return [city, region].filter(Boolean).join(", ") || cleanText(address.name);
}

function diagnosticUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (key !== "clickType") url.searchParams.set(key, "[redacted]");
    }
    url.hash = "";
    return url.toString();
  } catch { return "[invalid URL]"; }
}

/** Parse accessible HTML only. Never interpret a challenge or an application shell as a listing. */
export function parseVehicleListing(html: string, listingUrl: string, diagnostics: ListingDiagnostics): ListingSnapshot {
  const url = new URL(listingUrl);
  diagnostics.pageTitle = pageTitle(html);
  diagnostics.challengeDetected = isChallenge(html, diagnostics.pageTitle);
  if (diagnostics.challengeDetected) return {
    sourceStatus: "blocked", sourceMessage: "AutoTrader returned an access or verification page instead of the listing.", diagnostics,
  };
  if (/listing (?:is |has been )?(?:removed|expired|no longer available)|vehicle is no longer available/i.test(html.slice(0, 100_000))) {
    return { sourceStatus: "removed", sourceMessage: "This listing appears to be removed or expired.", diagnostics };
  }

  const scripts = jsonScripts(html);
  diagnostics.jsonLdFound = scripts.found;
  const ldRecords = scripts.jsonLd.flatMap(item => records(item));
  const stateRecords = scripts.state.flatMap(item => records(item));
  const vehicle = ldRecords.find(item => hasType(item, VEHICLE_TYPES) &&
    (item.vehicleIdentificationNumber || item.mileageFromOdometer || item.offers || item.model || item.name));
  diagnostics.vehicleSchemaFound = Boolean(vehicle);
  const stateVehicle = stateRecords.find(item =>
    (item.vin || item.vehicleIdentificationNumber || item.mileage || item.odometer) &&
    (item.make || item.model || item.year || item.vehicleYear || item.title));
  const source = vehicle ?? stateVehicle;
  const offer = asRecord(first(source?.offers)) ?? ldRecords.find(item => hasType(item, ["offer"]) && item.price);
  const seller = asRecord(first(offer?.seller ?? source?.seller)) ??
    ldRecords.find(item => hasType(item, ["autodealer"]) && item.name) ??
    stateRecords.find(item => (item.dealerName || item.sellerName) && (item.city || item.address));
  const mileage = asRecord(source?.mileageFromOdometer ?? source?.odometer);
  const fieldSources: Record<string, string> = {};
  const origin = vehicle ? "json-ld" : "embedded-state";
  function choose(field: string, candidates: [unknown, string][]): string | undefined {
    for (const [value, sourceName] of candidates) {
      const text = cleanText(value);
      if (text) { fieldSources[field] = sourceName; return text; }
    }
    return undefined;
  }

  const yearValue = cleanText(source?.vehicleModelDate ?? source?.productionDate ?? source?.year ?? source?.vehicleYear);
  const year = choose("year", [[yearValue?.match(/\b(?:19|20)\d{2}\b/)?.[0], origin]]);
  const make = choose("make", [[recordText(source?.brand ?? source?.make), origin]]);
  const model = choose("model", [[recordText(source?.model), origin]]);
  const trim = choose("trim", [[source?.vehicleConfiguration ?? source?.trim, origin]]);
  const title = choose("title", [
    [source?.name ?? source?.title, origin],
    [metaValue(html, "og:title"), "open-graph"],
    [metaValue(html, "twitter:title"), "metadata"],
  ]) ?? ([year, make, model, trim].filter(Boolean).join(" ") || undefined);
  if (title && !fieldSources.title) fieldSources.title = origin;
  const price = choose("price", [
    [formatPrice(offer?.price ?? source?.price ?? stateVehicle?.listingPrice,
      offer?.priceCurrency ?? source?.priceCurrency ?? (url.hostname.endsWith(".co.uk") ? "GBP" : "USD")), origin],
    [formatPrice(metaValue(html, "product:price:amount"), metaValue(html, "product:price:currency")), "metadata"],
  ]);
  const mileageText = choose("mileage", [
    [formatMileage(mileage?.value ?? source?.mileage ?? stateVehicle?.mileage,
      mileage?.unitCode ?? mileage?.unitText ?? "miles"), origin],
    [html.match(/\b[\d,]+\s*(?:miles|mi|km)\b/i)?.[0], "visible-text"],
  ]);
  const sellerName = choose("seller", [
    [recordText(seller?.name ?? source?.dealerName ?? source?.sellerName), origin],
    [metaValue(html, "author"), "metadata"],
  ]);
  const location = choose("location", [
    [locationOf(seller?.address ?? seller?.location ?? source?.sellerLocation), origin],
    [[cleanText(seller?.city ?? source?.city), cleanText(seller?.state ?? source?.state)].filter(Boolean).join(", "), origin],
    [metaValue(html, "geo.placename"), "metadata"],
  ]);
  const vin = choose("vin", [[source?.vehicleIdentificationNumber ?? source?.vin, origin]]);
  const conditionValue = cleanText(source?.itemCondition ?? source?.condition);
  const condition = choose("condition", [[conditionValue?.match(/(?:New|Used|Refurbished|Damaged)Condition/i)?.[0].replace(/Condition$/i, "") ?? conditionValue, origin]]);
  const sellerRating = choose("sellerRating", [[formatRating(seller?.aggregateRating ?? source?.aggregateRating), origin]]);
  const imageList = [
    ...images(source?.image ?? source?.images, url),
    ...images(metaValue(html, "og:image"), url),
    ...images(metaValue(html, "twitter:image"), url),
  ].filter((value, index, all) => all.indexOf(value) === index).slice(0, MAX_IMAGES);
  if (imageList.length) fieldSources.images = source?.image ? origin : "metadata";
  const listingUrlValue = absoluteUrl(source?.url ?? metaValue(html, "og:url"), url) ?? url.toString();
  fieldSources.listingUrl = source?.url ? origin : metaValue(html, "og:url") ? "open-graph" : "request-url";
  diagnostics.fieldSources = fieldSources;

  const meaningful = Boolean(title && (price || mileageText || vin || sellerName));
  const status = meaningful ? "extracted" : scripts.malformed && !source && !price
    ? "parser_failed" : /__NEXT_DATA__|id=["']__next|enable javascript/i.test(html) && !source
      ? "javascript_required" : "required_data_unavailable";
  return {
    title, year, make, model, trim, price, mileage: mileageText, vin, condition,
    seller: sellerName, sellerRating, location, images: imageList, listingUrl: listingUrlValue,
    sourceStatus: status,
    sourceMessage: status === "extracted" ? undefined : status === "parser_failed"
      ? "The listing metadata could not be parsed." : status === "javascript_required"
        ? "The page did not include listing data in its initial HTML; JavaScript rendering may be required."
        : "The page loaded but did not provide enough vehicle details for a report.",
    diagnostics,
  };
}

export async function fetchAutoTraderListing(listingUrl: string): Promise<ListingSnapshot> {
  const diagnostics: ListingDiagnostics = { requestedUrl: diagnosticUrl(listingUrl), javascriptRenderingUsed: false };
  const failure = (sourceStatus: ListingSnapshot["sourceStatus"], sourceMessage: string): ListingSnapshot =>
    ({ sourceStatus, sourceMessage, diagnostics });
  let url: URL;
  try { url = new URL(listingUrl); }
  catch { return failure("unsupported", "The listing URL is invalid."); }
  if (url.protocol !== "https:" || !["autotrader.com", "www.autotrader.com", "autotrader.co.uk", "www.autotrader.co.uk"].includes(url.hostname.toLowerCase())) {
    return failure("unsupported", "This is not a supported AutoTrader listing URL.");
  }
  if (!(/^\/cars-for-sale\/vehicle\/\d+\/?$/.test(url.pathname) || url.hostname.endsWith(".co.uk") && /(?:car-details|\/details\/)/.test(url.pathname))) {
    return failure("unsupported", "This AutoTrader URL does not point to a vehicle listing.");
  }

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml" }, redirect: "follow" });
  } catch {
    return failure("required_data_unavailable", "AutoTrader could not be reached from the report server.");
  }
  const finalUrl = response.url || url.toString();
  diagnostics.finalUrl = diagnosticUrl(finalUrl);
  diagnostics.httpStatus = response.status;
  diagnostics.redirected = response.redirected;
  diagnostics.responseHeaders = Object.fromEntries(["content-type", "content-length", "server", "cache-control"]
    .map(key => [key, response.headers.get(key)]).filter((entry): entry is [string, string] => entry[1] !== null));
  const log = (listing: ListingSnapshot) => {
    if (process.env.NODE_ENV !== "production" || listing.sourceStatus !== "extracted") {
      console.info("listing-extraction", { ...diagnostics, sourceStatus: listing.sourceStatus });
    }
    return listing;
  };
  if ([404, 410].includes(response.status)) return log(failure("removed", "This listing was removed or expired."));
  if ([401, 403, 429].includes(response.status)) return log(failure("blocked", "AutoTrader did not allow this page to be read."));
  if (!response.ok) return log(failure("required_data_unavailable", `AutoTrader returned HTTP ${response.status}.`));
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_HTML_BYTES) return log(failure("required_data_unavailable", "The listing page exceeds the preview limit."));
  try {
    const bytes = await response.arrayBuffer();
    diagnostics.responseBytes = bytes.byteLength;
    if (bytes.byteLength > MAX_HTML_BYTES) return log(failure("required_data_unavailable", "The listing page exceeds the preview limit."));
    const finalPageUrl = new URL(finalUrl);
    if (!["autotrader.com", "www.autotrader.com", "autotrader.co.uk", "www.autotrader.co.uk"].includes(finalPageUrl.hostname.toLowerCase())) {
      return log(failure("unsupported", "The listing redirected outside AutoTrader."));
    }
    return log(parseVehicleListing(new TextDecoder().decode(bytes), finalPageUrl.toString(), diagnostics));
  } catch {
    return log(failure("parser_failed", "The listing response could not be processed."));
  }
}
