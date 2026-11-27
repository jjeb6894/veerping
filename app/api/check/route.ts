import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { detectPlatform } from "@/lib/adapters";
import type { TrustScoreResult } from "@/types";

/**
 * Prepare a reusable report preview for a pasted listing URL.
 *
 * This endpoint deliberately does not copy AutoTrader content or fabricate
 * results from an unverified URL. No real vehicle-history provider is wired.
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

  // AutoTrader page content is not copied into paid reports without permission.
  const result: TrustScoreResult = {
    id: randomUUID(),
    url,
    platformId: adapter.id,
    platformName: adapter.name,
    score: null,
    tier: null,
    tierLabel: null,
    checks: [],
    listing: undefined,
    vinDecode: undefined,
    photoUrl: undefined,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
