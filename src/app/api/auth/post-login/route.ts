import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { determineUserRoleAndRouting } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Authoritative Post-Login / Post-Verification Routing Endpoint
 * 
 * Determines user role (Admin vs Student) and returns the exact target destination:
 * - ADMIN -> /admin
 * - STUDENT (incomplete) -> /onboarding
 * - STUDENT (complete) -> /dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    let adminDb: any = null;
    try {
      adminDb = createAdminClient();
    } catch {
      // Ignore if secret key not present
    }

    const decision = await determineUserRoleAndRouting(user, supabase, adminDb);

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      role: decision.role,
      isAdmin: decision.isAdmin,
      targetUrl: decision.targetUrl,
      isProfileCompleted: decision.isProfileCompleted,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during post-login routing" },
      { status: 500 }
    );
  }
}
