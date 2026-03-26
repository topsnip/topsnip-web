import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { checkOrigin } from "@/lib/csrf";
import { portalLimiter } from "@/lib/ratelimit";

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
  try {
    // [M19 fix] CSRF Origin header check
    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Rate limit — prevent portal session abuse
    if (await portalLimiter.check(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const db = createServiceClient();
    const { data: profile } = await db
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing profile found. You must overlap a subscription to access the portal." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[/api/stripe/portal]", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Could not create billing portal session" }, { status: 500 });
  }
}
