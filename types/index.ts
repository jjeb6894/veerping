/**
 * Shared domain types for TrustLink.
 */

export type PlatformCategory =
  | "marketplace"
  | "car-sales"
  | "professional"
  | "social-influencer";

export type CheckType =
  | "reverseImageSearch"
  | "aiImageDetection"
  | "crossPlatformMatch"
  | "accountAgeHistory"
  | "reviewSentiment"
  | "priceAnomalyDetection"
  | "metadataForensics"
  | "domainAgeLookup"
  | "duplicateListingScan"
  | "contactInfoVerification"
  | "blacklistDatabaseCheck"
  | "socialProofVerification"
  | "paymentRiskCheck"
  | "listingConsistencyCheck"
  | "shippingPolicyRiskCheck";

/** One row in an adapter's `selectors` map: a CSS selector + what it extracts. */
export interface AdapterSelector {
  selector: string;
  attribute?: string; // e.g. "src", "href" — omit for text content
  description: string;
}

/** A single supported platform, defined entirely by config (no code changes). */
export interface PlatformAdapter {
  id: string;
  name: string;
  category: PlatformCategory;
  domains: string[]; // hostnames (without protocol) this adapter matches
  urlPatterns: string[]; // regex strings tested against the full URL
  icon: string; // emoji or short glyph used in the mega-menu
  description: string;
  selectors: Record<string, AdapterSelector>;
  checks: CheckType[]; // which pipeline checks apply to this platform
  notes?: string;
}

export interface CheckResult {
  type: CheckType;
  label: string;
  score: number; // 0-100 contribution score for this individual check
  weight: number; // relative weight used when aggregating
  summary: string;
  detail?: string;
  stubbed: true; // every check in this scaffold is a stub pending real APIs
}

export type TrustTier = "insured" | "trusted" | "caution" | "risk";

export interface ListingSnapshot {
  title?: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  price?: string;
  mileage?: string;
  vin?: string;
  registration?: string;
  condition?: string;
  seller?: string;
  sellerRating?: string;
  location?: string;
  images?: string[];
  listingUrl?: string;
  sourceStatus: "extracted" | "unsupported" | "removed" | "blocked" | "javascript_required" | "parser_failed" | "required_data_unavailable";
  sourceMessage?: string;
  diagnostics?: ListingDiagnostics;
}

export interface ListingDiagnostics {
  requestedUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  responseHeaders?: Record<string, string>;
  redirected?: boolean;
  pageTitle?: string;
  responseBytes?: number;
  jsonLdFound?: boolean;
  vehicleSchemaFound?: boolean;
  javascriptRenderingUsed: boolean;
  challengeDetected?: boolean;
  fieldSources?: Record<string, string>;
}

export interface TrustScoreResult {
  id: string;
  url: string;
  platformId: string;
  platformName: string;
  score: number | null; // unavailable until actual checks can support a score
  tier: TrustTier | null;
  tierLabel: string | null;
  checks: CheckResult[];
  listing?: ListingSnapshot;
  vinDecode?: { status: "decoded" | "invalid" | "unavailable"; make?: string; model?: string; year?: string };
  photoUrl?: string;
  createdAt: string;
}

export interface LiveActivityEntry {
  id: string;
  actor: string; // masked username, e.g. "u***34"
  action: string; // e.g. "just listed a verified car"
  platformId: string;
  score: number;
  tier: TrustTier;
  timestamp: string;
}

/**
 * "Local Trust Board" — a by-country feature on the homepage. Instead of a
 * single pasted listing, this scores well-known brands/sites themselves
 * using automated, rule-based signal checks (no AI/LLM involved, just
 * fixed formulas over data that would come from real public APIs).
 */
export type LocalBrandSignalType =
  | "googleMyBusiness"
  | "trustpilot"
  | "checkIns"
  | "priceValue"
  | "afterSales";

export interface LocalBrandSignalResult {
  type: LocalBrandSignalType;
  label: string;
  score: number; // 0-100
  summary: string;
  stubbed: true;
}

/** "trading" = a buy/sell marketplace or classifieds site; "general" = an everyday consumer brand. */
export type LocalBrandSegment = "trading" | "general";

/** One entry in a country's brand config (see data/local-brands/*.json). */
export interface LocalBrand {
  id: string;
  name: string;
  category: string;
  segment: LocalBrandSegment;
  icon: string;
  isGlobal: boolean; // international chain/site vs. a country-local business
}

export interface LocalBrandScore {
  brand: LocalBrand;
  score: number; // 0-100 composite
  tier: TrustTier;
  tierLabel: string;
  breakdown: {
    price: number;
    trust: number;
    quality: number;
    afterSales: number;
    popularity: number;
  };
  signals: LocalBrandSignalResult[];
}

export interface CountryBrandData {
  countryCode: string;
  countryName: string;
  flag: string;
  brands: LocalBrand[];
}

export interface CountryBrandBoard {
  countryCode: string;
  countryName: string;
  flag: string;
  brands: LocalBrandScore[];
}

/** What a user is claiming/listing: their own profile, a company, or a one-off listing. */
export type ListingKind = "profile" | "company" | "listing";

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  profile: "My Profile",
  company: "My Company",
  listing: "This Listing",
};

/** Submitted after a Trust Check result, to publish a shareable public page. */
export interface DirectoryEntrySubmission {
  url: string;
  kind: ListingKind;
  displayName: string;
  contactEmail: string;
}

/** Everything needed to render the public /l/[slug] page, with no server storage. */
export interface DirectoryEntryPayload {
  kind: ListingKind;
  displayName: string;
  url: string;
  platformName: string;
  score: number;
  tier: TrustTier;
  tierLabel: string;
  checksPassed: number;
  checksTotal: number;
  createdAt: string;
}

export interface ClaimSubmission {
  id?: string;
  listingUrl: string;
  trustScoreId?: string;
  claimantName: string;
  claimantEmail: string;
  amount: number;
  currency: string;
  description: string;
  status?: "pending" | "reviewing" | "approved" | "denied";
}

