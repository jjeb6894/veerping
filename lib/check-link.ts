/**
 * Shareable vehicle-check links (`/v/[token]`): the token is the listing URL
 * base64url-encoded, so the link is stateless and works anywhere.
 */

export function encodeListingToken(listingUrl: string): string {
  return Buffer.from(listingUrl, "utf-8").toString("base64url");
}

export function decodeListingToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = new URL(decoded);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? decoded : null;
  } catch {
    return null;
  }
}

const RESULT_CACHE_PREFIX = "templatechecklist:check-result:";

export function storeCachedResult(result: { url: string }) {
  try {
    sessionStorage.setItem(RESULT_CACHE_PREFIX + result.url, JSON.stringify(result));
  } catch { /* Cache is best-effort. */ }
}

export function buildShareUrl(listingUrl: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/v/${encodeListingToken(listingUrl)}`;
}
