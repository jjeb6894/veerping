import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseVehicleListing } from "@/lib/listing-parser";
import type { ListingSnapshot } from "@/types";

/** Fallback for AutoTrader UK pages that reject a plain server request. */
export async function renderAutoTraderListing(listingUrl: string): Promise<ListingSnapshot | null> {
  let url: URL;
  try { url = new URL(listingUrl); } catch { return null; }
  if (url.protocol !== "https:" || !["autotrader.co.uk", "www.autotrader.co.uk"].includes(url.hostname) ||
      url.port || !/^\/car-details\/\d+\/?$/.test(url.pathname)) return null;
  // Only the listing identifier is needed; tracking and finance parameters are not sent.
  url.search = "";
  url.hash = "";
  let binding: BrowserWorker | undefined;
  try { binding = (getCloudflareContext().env as unknown as { LISTING_BROWSER?: BrowserWorker }).LISTING_BROWSER; }
  catch { return null; }
  if (!binding) return null;

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

