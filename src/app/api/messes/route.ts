import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: messes, error: queryError } = await supabase
      .from("messes")
      .select("id, name, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!queryError && messes && messes.length > 0) {
      return NextResponse.json({
        success: true,
        messes,
      });
    }

    if (queryError) {
      console.error("[/api/messes] Standard client query failed:", queryError);
    }

    // Try fallback to admin client
    let adminMesses: any[] | null = null;
    let adminError: any = null;

    try {
      const adminDb = createAdminClient();
      const adminRes = await adminDb
        .from("messes")
        .select("id, name, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("name", { ascending: true });

      adminMesses = adminRes.data;
      adminError = adminRes.error;
    } catch (err: any) {
      adminError = err;
      console.error("[/api/messes] Admin fallback client initialization failed:", err.message);
    }

    if (!adminError && adminMesses && adminMesses.length > 0) {
      return NextResponse.json({
        success: true,
        messes: adminMesses,
      });
    }

    // If both queries failed, return the real error details
    const finalError = queryError || adminError;
    const errorMessage = finalError?.message || "Failed to load mess facilities from database.";
    const errorHint =
      finalError?.hint ||
      (finalError?.code === "42501"
        ? "Run migration 005 to grant table privileges in Supabase."
        : undefined);

    console.error("[/api/messes] All mess query attempts failed:", {
      queryError,
      adminError,
      errorMessage,
      errorHint,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        hint: errorHint,
        code: finalError?.code,
        messes: [],
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("[/api/messes] Unexpected server exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error", messes: [] },
      { status: 500 }
    );
  }
}
