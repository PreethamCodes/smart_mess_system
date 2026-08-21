import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MALE_HOSTELS, FEMALE_HOSTELS, HOSTEL_TO_MESS_NAME_MAP } from "@/lib/constants/hostels";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    let { data: mappings, error } = await supabase
      .from("hostel_mess_mapping")
      .select("id, hostel_name, gender, mess_id, mess:messes(id, name, is_active)")
      .order("hostel_name", { ascending: true });

    if (error || !mappings || mappings.length === 0) {
      try {
        const adminDb = createAdminClient();
        const adminRes = await adminDb
          .from("hostel_mess_mapping")
          .select("id, hostel_name, gender, mess_id, mess:messes(id, name, is_active)")
          .order("hostel_name", { ascending: true });
        mappings = adminRes.data || [];
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({
      success: true,
      mappings: mappings || [],
      maleHostels: MALE_HOSTELS,
      femaleHostels: FEMALE_HOSTELS,
      mappingDict: HOSTEL_TO_MESS_NAME_MAP,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
