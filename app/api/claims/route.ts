import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Claim submissions are currently unavailable." },
    { status: 410 },
  );
}
