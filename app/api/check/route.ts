import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { detectPlatform } from "@/lib/adapters";
import { fetchAutoTraderUkListing } from "@/lib/listing-parser";
import { aggregateScore, runCheckPipeline, tierForScore } from "@/lib/scoring";
import type { TrustScoreResult } from "@/types";

/**
 * Prepare a reusable report preview for a pasted listing URL.
 *
 * AutoTrader UK pages are read from their public HTML metadata so the preview
 * can show the vehicle details and photos that the source exposes. The trust
 * checks remain clearly labelled as simulated until provider integrations are
 * connected.
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

  const listing = adapter.id === "autotrader"
    ? await fetchAutoTraderUkListing(url)
    : undefined;
  const checks = runCheckPipeline(url, adapter.checks);
  const score = aggregateScore(checks);
  const { tier, label } = tierForScore(score);

  const result: TrustScoreResult = {
    id: randomUUID(),
    url,
    platformId: adapter.id,
    platformName: adapter.name,
    score,
    tier,
    tierLabel: label,
    checks,
    listing,
    photoUrl: listing?.images?.[0],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
