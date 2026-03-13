import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
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

// Next.js App Router — must export config to prevent body parsing
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // ── Verify webhook signature ───────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  // ── Handle events ──────────────────────────────────────────────────────────
  switch (event.type) {

    // Payment succeeded — activate Pro
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.metadata?.supabase_user_id;
      if (!userId) {
        console.error("checkout.session.completed: no supabase_user_id in metadata");
        break;
      }

      const { error } = await db
        .from("profiles")
        .update({
          plan: "pro",
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) console.error("checkout.session.completed DB update error:", error);
      break;
    }

    // Subscription changed — renewal, upgrade, downgrade, payment failure
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Map Stripe status to plan
      const isActive = sub.status === "active";
      const plan = isActive ? "pro" : "free";

      const { error } = await db
        .from("profiles")
        .update({
          plan,
          subscription_status: sub.status,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("customer.subscription.updated DB update error:", error);
      break;
    }

    // Subscription cancelled — downgrade to free
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const { error } = await db
        .from("profiles")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("customer.subscription.deleted DB update error:", error);
      break;
    }

    // Payment failed — downgrade to free to prevent unpaid access
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { error } = await db
        .from("profiles")
        .update({
          plan: "free",
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_customer_id", customerId);

      if (error) console.error("invoice.payment_failed DB update error:", error);
      break;
    }

    default:
      // Unhandled event — not an error, just ignore
      break;
  }

  return NextResponse.json({ received: true });
}
