import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";

/**
 * Controlled Admin Bootstrap Route
 * 
 * Verifies if the authenticated user's email is listed in the server-only ADMIN_EMAILS
 * environment variable. If authorized, assigns the 'ADMIN' role in public.user_roles.
 * Any unauthorized user attempting this is rejected with 403 Forbidden.
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

    // Check against server-only ADMIN_EMAILS list
    if (!isPreconfiguredAdminEmail(user.email)) {
      return NextResponse.json(
        {
          error:
            "Forbidden. This account is not listed in the authorized ADMIN_EMAILS configuration.",
        },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // Upsert the ADMIN role for this user
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "ADMIN")
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({
        success: true,
        message: "Account already has ADMIN role assigned.",
        role: "ADMIN",
      });
    }

    const { error: insertError } = await adminClient.from("user_roles").insert({
      user_id: user.id,
      role: "ADMIN",
    });

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to assign ADMIN role: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ADMIN role successfully granted to authorized account.",
      role: "ADMIN",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
