import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Billing is disabled for TopSnip v3" },
    { status: 410 }
  );
}
