import type { CheckType } from "@/types";

/**
 * À la carte pricing for Verified Listing certification. The base fee always
 * applies; each optional check add-on can be toggled on/off and, if it
 * passes, contributes a Trust Boost percentage to the published listing.
 *
 * TODO: wire these to real Stripe Price IDs (see app/api/stripe/*) instead
 * of flat cent amounts once live payments are enabled.
 */
export const BASE_CERTIFICATION_PRICE_CENTS = 199; // $1.99 per listing, always included

export const ADD_ON_CHECKS: Record<CheckType, { priceCents: number; trustBoostPercent: number }> = {
  reverseImageSearch: { priceCents: 30, trustBoostPercent: 8 },
  aiImageDetection: { priceCents: 15, trustBoostPercent: 5 },
  duplicateListingScan: { priceCents: 15, trustBoostPercent: 5 },
  crossPlatformMatch: { priceCents: 25, trustBoostPercent: 6 },
  accountAgeHistory: { priceCents: 20, trustBoostPercent: 7 },
  reviewSentiment: { priceCents: 20, trustBoostPercent: 6 },
  priceAnomalyDetection: { priceCents: 15, trustBoostPercent: 4 },
  metadataForensics: { priceCents: 15, trustBoostPercent: 4 },
  domainAgeLookup: { priceCents: 10, trustBoostPercent: 3 },
  contactInfoVerification: { priceCents: 10, trustBoostPercent: 3 },
  blacklistDatabaseCheck: { priceCents: 25, trustBoostPercent: 7 },
  socialProofVerification: { priceCents: 20, trustBoostPercent: 5 },
  paymentRiskCheck: { priceCents: 20, trustBoostPercent: 5 },
  listingConsistencyCheck: { priceCents: 15, trustBoostPercent: 4 },
  shippingPolicyRiskCheck: { priceCents: 10, trustBoostPercent: 3 },
};

export function formatCents(cents: number, currency = "$"): string {
  return `${currency}${(cents / 100).toFixed(2)}`;
}

export function totalPriceCents(selected: CheckType[]): number {
  return (
    BASE_CERTIFICATION_PRICE_CENTS +
    selected.reduce((sum, type) => sum + ADD_ON_CHECKS[type].priceCents, 0)
  );
}

/**
 * Sum of Trust Boost % across selected add-ons that actually passed
 * (score >= CHECK_PASS_THRESHOLD). Capped so the boost stays credible.
 */
export function trustBoostPercent(
  selected: CheckType[],
  passed: Set<CheckType>
): number {
  const raw = selected
    .filter((type) => passed.has(type))
    .reduce((sum, type) => sum + ADD_ON_CHECKS[type].trustBoostPercent, 0);
  return Math.min(40, raw);
}

/**
 * Illustrative, rule-based estimate of the extra sale proceeds a Verified
 * badge + Trust Boost is associated with — not a guarantee, just a simple
 * deterministic formula (higher base trust + more paid verifications both
 * increase the conversion-lift estimate, with diminishing returns via a cap).
 */
export function estimateProfitLift(
  listingPriceCents: number,
  baseScore: number,
  boostPercent: number
): { upliftPercent: number; extraCents: number } {
  const scoreFactor = Math.max(0, baseScore - 50) * 0.25; // up to ~12.5 pts at score 100
  const boostFactor = boostPercent * 0.6; // paid add-ons compound the lift
  const upliftPercent = Math.min(32, 6 + scoreFactor + boostFactor);
  const extraCents = Math.round(listingPriceCents * (upliftPercent / 100));
  return { upliftPercent: Math.round(upliftPercent * 10) / 10, extraCents };
}


export type ReportCurrency = "GBP" | "EUR" | "USD" | "CAD" | "AUD";

export type ReportQuote = {
  countryCode: string;
  currency: ReportCurrency;
  amountMinor: number;
  formattedAmount: string;
  displayOnly: true;
};

const EURO_COUNTRIES = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "IE", "IT", "LT",
  "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

const CURRENCY_BY_COUNTRY: Record<string, ReportCurrency> = {
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
};

export function countryCodeFromRequest(request: Request) {
  return (
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-country-code") ??
    "US"
  ).toUpperCase();
}

export function currencyForCountry(countryCode: string): ReportCurrency {
  const code = countryCode.toUpperCase();
  if (EURO_COUNTRIES.has(code)) return "EUR";
  return CURRENCY_BY_COUNTRY[code] ?? "USD";
}

export function reportQuote(countryCode: string): ReportQuote {
  const currency = currencyForCountry(countryCode);
  const amountMinor = 999;
  const locale =
    currency === "GBP"
      ? "en-GB"
      : currency === "EUR"
        ? "de-DE"
        : currency === "CAD"
          ? "en-CA"
          : currency === "AUD"
            ? "en-AU"
            : "en-US";

  return {
    countryCode: countryCode.toUpperCase(),
    currency,
    amountMinor,
    formattedAmount: new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100),
    displayOnly: true,
  };
}
