import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    let { data: messes, error } = await supabase
      .from("messes")
      .select("id, name, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    // If standard query fails or returns empty, try admin client as a resilient fallback
    if (error || !messes || messes.length === 0) {
      try {
        const adminDb = createAdminClient();
        const adminRes = await adminDb
          .from("messes")
          .select("id, name, is_active, created_at, updated_at")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (adminRes.data && adminRes.data.length > 0) {
          messes = adminRes.data;
        }
      } catch {
        // Fallback handled
      }
    }

    return NextResponse.json({
      success: true,
      messes: messes || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
