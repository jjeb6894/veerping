import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { detectPlatform } from "@/lib/adapters";
import { fetchAutoTraderListing } from "@/lib/listing-parser";
import { renderAutoTraderListing } from "@/lib/rendered-autotrader";
import { decodeVin } from "@/lib/vin-decoder";
import { aggregateScore, runCheckPipeline, tierForScore } from "@/lib/scoring";
import type { TrustScoreResult } from "@/types";

/**
 * Prepare a reusable report preview for a pasted listing URL.
 *
 * AutoTrader pages are read from their public HTML metadata so the preview
 * can show the vehicle details and photos that the source exposes.
 * A deterministic trust score is always generated from the URL so the UI
 * can display a score and enable payment.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const url = body.url?.trim();

  if (!url) {
    return NextResponse.json({ error: "Missing url in request body." }, { status: 400 });
  }

  const adapter = detectPlatform(url);
  if (!adapter) {
    return NextResponse.json(
      { error: "Unsupported platform. No matching adapter found for this URL." },
      { status: 422 }
    );
  }

  let listing = adapter.id === "autotrader"
    ? await fetchAutoTraderListing(url)
    : undefined;
  if (listing?.sourceStatus === "blocked" || listing?.sourceStatus === "javascript_required") {
    listing = await renderAutoTraderListing(url, request.headers.get("cf-connecting-ip")) ?? listing;
  }

  const checks = runCheckPipeline(url, adapter.checks);
  const score = aggregateScore(checks);
  const { tier, label: tierLabel } = tierForScore(score);

  const result: TrustScoreResult = {
    id: randomUUID(),
    url,
    platformId: adapter.id,
    platformName: adapter.name,
    score,
    tier,
    tierLabel,
    checks,
    listing,
    vinDecode: listing?.vin ? await decodeVin(listing.vin) : undefined,
    photoUrl: listing?.images?.[0],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
