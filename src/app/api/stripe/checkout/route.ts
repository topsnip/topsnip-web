import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function createServiceClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const { interval } = await req.json();

  if (!interval || !["monthly", "yearly"].includes(interval)) {
    return NextResponse.json({ error: "interval must be 'monthly' or 'yearly'" }, { status: 400 });
  }

  // Resolve price ID server-side — never expose Stripe price IDs to the client
  const priceId =
    interval === "monthly"
      ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
      : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: "Stripe price ID not configured" }, { status: 500 });
  }

  // ── Authenticate user ──────────────────────────────────────────────────────
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Get or create Stripe customer ──────────────────────────────────────────
  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("stripe_customer_id, email, plan")
    .eq("id", user.id)
    .single();

  // Already on Pro — shouldn't be here, but guard anyway
  if (profile?.plan === "pro") {
    return NextResponse.json({ error: "Already on Pro" }, { status: 400 });
  }

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await db
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // ── Create Checkout Session ────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/upgrade?upgraded=true`,
    cancel_url: `${appUrl}/upgrade`,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
