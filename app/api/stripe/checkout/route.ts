import { NextResponse } from "next/server";
import Stripe from "stripe";

const FALLBACK_PRICE_IDS: Record<string, string> = {
  "one-off-check": "price_REPLACE_ONE_OFF_CHECK",
  "human-validation": "price_REPLACE_HUMAN_VALIDATION",
  "seller-starter": "price_REPLACE_SELLER_STARTER",
  "seller-pro": "price_REPLACE_SELLER_PRO",
  "seller-business": "price_REPLACE_SELLER_BUSINESS",
};

const ONE_OFF_PRICE_ENV: Record<string, string> = {
  GBP: "STRIPE_PRICE_ONE_OFF_GBP",
  EUR: "STRIPE_PRICE_ONE_OFF_EUR",
  USD: "STRIPE_PRICE_ONE_OFF_USD",
  CAD: "STRIPE_PRICE_ONE_OFF_CAD",
  AUD: "STRIPE_PRICE_ONE_OFF_AUD",
};

const RECURRING_PLANS = new Set(["seller-starter", "seller-pro", "seller-business"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    currency?: string;
    url?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  const plan = body.plan;
  const currency = body.currency?.toUpperCase() ?? "USD";
  const priceId =
    plan === "one-off-check"
      ? process.env[ONE_OFF_PRICE_ENV[currency] ?? ""] ?? FALLBACK_PRICE_IDS[plan]
      : plan
        ? FALLBACK_PRICE_IDS[plan]
        : undefined;

  if (!plan || !priceId) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === "sk_test_placeholder" || priceId.includes("REPLACE_")) {
    return NextResponse.json(
      {
        error:
          "Checkout is not configured yet. Add STRIPE_SECRET_KEY and a Stripe Price ID for the selected currency.",
        stubbed: true,
      },
      { status: 501 }
    );
  }

  const metadata: Record<string, string> = { plan, currency };
  if (body.url) metadata.listingUrl = body.url;

  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: RECURRING_PLANS.has(plan) ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: body.successUrl ?? "https://templatechecklist.com/results?checkout=success",
    cancel_url: body.cancelUrl ?? "https://templatechecklist.com/pricing?checkout=cancelled",
    metadata,
  });

  return NextResponse.json({ url: session.url });
}
