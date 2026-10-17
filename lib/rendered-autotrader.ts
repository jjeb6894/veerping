import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseVehicleListing } from "@/lib/listing-parser";
import type { ListingSnapshot } from "@/types";

/** Fallback for AutoTrader UK pages that reject a plain server request. */
export async function renderAutoTraderListing(listingUrl: string, clientIp: string | null): Promise<ListingSnapshot | null> {
  let url: URL;
  try { url = new URL(listingUrl); } catch { return null; }
  if (url.protocol !== "https:" || !["autotrader.co.uk", "www.autotrader.co.uk"].includes(url.hostname) ||
      url.port || !/^\/car-details\/\d+\/?$/.test(url.pathname)) return null;
  // Only the listing identifier is needed; tracking and finance parameters are not sent.
  url.search = "";
  url.hash = "";
  type Limiter = { limit(input: { key: string }): Promise<{ success: boolean }> };
  let env: { LISTING_BROWSER?: BrowserWorker; LISTING_RATE_LIMIT?: Limiter; LISTING_GLOBAL_LIMIT?: Limiter };
  try { env = getCloudflareContext().env as unknown as typeof env; }
  catch { return null; }
  const binding = env.LISTING_BROWSER;
  if (!binding || !env.LISTING_RATE_LIMIT || !env.LISTING_GLOBAL_LIMIT || !clientIp) return null;
  try {
    if (!(await env.LISTING_RATE_LIMIT.limit({ key: clientIp })).success ||
        !(await env.LISTING_GLOBAL_LIMIT.limit({ key: "listing-import" })).success) return null;
  } catch { return null; }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch(binding);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", request => {
      try {
        const resource = new URL(request.url());
        const host = resource.hostname;
        const allowed = resource.protocol === "https:" && !resource.port &&
          (host === "autotrader.co.uk" || host.endsWith(".autotrader.co.uk") || host === "atcdn.co.uk" || host.endsWith(".atcdn.co.uk"));
        void (allowed ? request.continue() : request.abort());
      } catch { void request.abort(); }
    });
    const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 25000 });
    if (!response || !response.ok()) return null;
    await page.waitForSelector("h1", { timeout: 5000 }).catch(() => undefined);
    const finalUrl = new URL(page.url());
    if (!["autotrader.co.uk", "www.autotrader.co.uk"].includes(finalUrl.hostname) ||
        finalUrl.protocol !== "https:" || finalUrl.port || !/^\/car-details\/\d+\/?$/.test(finalUrl.pathname)) return null;
    const html = await page.content();
    if (html.length > 4_000_000) return null;
    const listing = parseVehicleListing(html, finalUrl.toString(), {
      requestedUrl: url.toString(), finalUrl: finalUrl.toString(), httpStatus: response.status(), javascriptRenderingUsed: true,
    });
    return listing.sourceStatus === "extracted" ? listing : null;
  } catch {
    return null;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

