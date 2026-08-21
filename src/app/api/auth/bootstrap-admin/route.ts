import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailConfiguredAsAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Server-Side Admin Role Bootstrap Endpoint
 * 
 * Verifies if the authenticated user's email is present in ADMIN_EMAILS.
 * If yes, grants them the ADMIN role in public.user_roles using the server service role.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const email = user.email.toLowerCase();
    const shouldBeAdmin = isEmailConfiguredAsAdmin(email);

    if (!shouldBeAdmin) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        message: "Email is not configured as an authorized administrator in ADMIN_EMAILS.",
      });
    }

    // Grant ADMIN role in public.user_roles
    const adminDb = createAdminClient();
    const { data: roleEntry, error: roleError } = await adminDb
      .from("user_roles")
      .upsert(
        {
          user_id: user.id,
          role: "ADMIN",
        },
        { onConflict: "user_id,role" }
      )
      .select()
      .single();

    if (roleError) {
      return NextResponse.json(
        { error: `Failed to bootstrap admin role: ${roleError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      message: "Admin role successfully verified and assigned.",
      role: roleEntry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during admin bootstrap" },
      { status: 500 }
    );
  }
}
