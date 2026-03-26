import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/ingest/service-client";
import { checkOrigin } from "@/lib/csrf";
import { deleteAccountLimiter } from "@/lib/ratelimit";

export async function DELETE(req: NextRequest) {
  // CSRF Origin check
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — prevent rapid delete attempts
  if (await deleteAccountLimiter.check(user.id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Use service client to delete the user from auth.users
  // ON DELETE CASCADE in schema will clean up all related data
  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Failed to delete user:", error.message);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
