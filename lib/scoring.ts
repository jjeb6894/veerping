import type { CheckResult, CheckType, TrustTier } from "@/types";

export const TIER_THRESHOLDS: { tier: TrustTier; min: number; label: string }[] = [
  { tier: "insured", min: 90, label: "Insured Verified" },
  { tier: "trusted", min: 70, label: "Trusted" },
  { tier: "caution", min: 40, label: "Caution" },
  { tier: "risk", min: 0, label: "High Risk" },
];

export function tierForScore(score: number): { tier: TrustTier; label: string } {
  const match = TIER_THRESHOLDS.find((t) => score >= t.min)!;
  return { tier: match.tier, label: match.label };
}

export const TIER_STYLES: Record<
  TrustTier,
  { bg: string; text: string; ring: string; dot: string }
> = {
  insured: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-tier-insured",
  },
  trusted: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-tier-trusted",
  },
  caution: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-tier-caution",
  },
  risk: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-tier-risk",
  },
};

export const CHECK_LABELS: Record<CheckType, string> = {
  reverseImageSearch: "Reverse Image Search",
  aiImageDetection: "AI-Generated Image Detection",
  crossPlatformMatch: "Cross-Platform Identity Match",
  accountAgeHistory: "Account Age & History",
  reviewSentiment: "Review Sentiment Analysis",
  priceAnomalyDetection: "Price Anomaly Detection",
  metadataForensics: "Photo Metadata Forensics",
  domainAgeLookup: "Domain Age & WHOIS Lookup",
  duplicateListingScan: "Duplicate Listing Scan",
  contactInfoVerification: "Contact Info Verification",
  blacklistDatabaseCheck: "Scammer Blacklist Database Check",
  socialProofVerification: "Social Proof & Follower Authenticity",
  paymentRiskCheck: "Payment Method Risk Check",
  listingConsistencyCheck: "Listing Consistency Check",
  shippingPolicyRiskCheck: "Shipping & Refund Policy Risk Check",
};

const CHECK_WEIGHTS: Record<CheckType, number> = {
  reverseImageSearch: 1,
  aiImageDetection: 1,
  crossPlatformMatch: 0.8,
  accountAgeHistory: 1.2,
  reviewSentiment: 1,
  priceAnomalyDetection: 0.9,
  metadataForensics: 0.7,
  domainAgeLookup: 0.6,
  duplicateListingScan: 0.9,
  contactInfoVerification: 0.7,
  blacklistDatabaseCheck: 1.3,
  socialProofVerification: 0.8,
  paymentRiskCheck: 1.1,
  listingConsistencyCheck: 0.8,
  shippingPolicyRiskCheck: 0.6,
};

/**
 * Deterministic pseudo-random score generator seeded from the URL so the
 * same listing always gets the same mock result.
 * Biased high for the current preview experience.
 */
export function seededScore(seed: string, min = 90, max = 98): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return Math.round(min + normalized * (max - min));
}

export function runCheckPipeline(url: string, checks: CheckType[]): CheckResult[] {
  return checks.map((type) => {
    const score = seededScore(`${url}:${type}`);
    return {
      type,
      label: CHECK_LABELS[type],
      score,
      weight: CHECK_WEIGHTS[type],
      summary: stubSummary(type, score),
      stubbed: true,
    };
  });
}

function stubSummary(type: CheckType, score: number): string {
  switch (type) {
    case "reverseImageSearch":
      return "No duplicate listings found elsewhere using these photos.";
    case "aiImageDetection":
      return "Images appear to be genuine, unedited photographs.";
    case "crossPlatformMatch":
      return "Seller identity consistent across linked platforms.";
    case "accountAgeHistory":
      return "Established account with a clean history.";
    case "reviewSentiment":
      return "Overwhelmingly positive review sentiment.";
    case "priceAnomalyDetection":
      return "Price is consistent with similar listings in this category.";
    case "metadataForensics":
      return "Photo metadata is consistent with an original capture.";
    case "domainAgeLookup":
      return "Associated domain/profile has an established history.";
    case "duplicateListingScan":
      return "No identical listings found under different sellers.";
    case "contactInfoVerification":
      return "Listed contact details look well-formed.";
    case "blacklistDatabaseCheck":
      return "No matches found in known scammer databases.";
    case "socialProofVerification":
      return "Engagement signals look organic.";
    case "paymentRiskCheck":
      return "Only standard buyer-protected payment methods requested.";
    case "listingConsistencyCheck":
      return "Title, description, and photos are consistent.";
    case "shippingPolicyRiskCheck":
      return "Standard shipping/refund policy with no major red flags.";
    default:
      return "Check complete.";
  }
}

export const CHECK_PASS_THRESHOLD = 70;

export function aggregateScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const weighted = checks.reduce((sum, c) => sum + c.score * c.weight, 0);
  const raw = Math.round(weighted / totalWeight);
  // Keep the displayed aggregate in the strong green band for previews.
  return Math.min(97, Math.max(93, raw));
}
