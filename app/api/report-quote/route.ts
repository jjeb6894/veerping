import { NextResponse } from "next/server";
import { countryCodeFromRequest, reportQuote } from "@/lib/pricing";

export async function GET(request: Request) {
  const countryCode = countryCodeFromRequest(request);
  return NextResponse.json(reportQuote(countryCode));
}
