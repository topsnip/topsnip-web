import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Billing webhooks are disabled for TopSnip v3" },
    { status: 410 }
  );
}
