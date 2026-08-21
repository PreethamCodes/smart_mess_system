import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentProfileSchema } from "@/lib/validations/student";
import { getMessNameForHostel } from "@/lib/constants/hostels";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("*, mess:messes(*)")
      .eq("id", user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      student: student || null,
      is_profile_completed: student?.is_profile_completed ?? false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = studentProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    // -------------------------------------------------------------------------
    // SERVER-SIDE DERIVATION: Automatic Hostel -> Mess Assignment
    // The server NEVER trusts client-supplied assigned_mess_id.
    // -------------------------------------------------------------------------
    let derivedMessId: string | null = null;

    // 1. Look up from database hostel_mess_mapping table
    const { data: mappingRecord, error: mappingError } = await supabase
      .from("hostel_mess_mapping")
      .select("mess_id, gender, messes!inner(id, name, is_active)")
      .eq("hostel_name", validatedData.hostel)
      .maybeSingle();

    if (mappingRecord?.mess_id) {
      derivedMessId = mappingRecord.mess_id;
    } else {
      // Fallback query using admin client or mess name resolution
      try {
        const adminDb = createAdminClient();
        const { data: adminMapping } = await adminDb
          .from("hostel_mess_mapping")
          .select("mess_id")
          .eq("hostel_name", validatedData.hostel)
          .maybeSingle();

        if (adminMapping?.mess_id) {
          derivedMessId = adminMapping.mess_id;
        } else {
          // Resolve mess name from authoritative constant map and query messes table
          const expectedMessName = getMessNameForHostel(validatedData.hostel);
          if (expectedMessName) {
            const { data: messRow } = await adminDb
              .from("messes")
              .select("id")
              .eq("name", expectedMessName)
              .maybeSingle();
            if (messRow?.id) {
              derivedMessId = messRow.id;
            }
          }
        }
      } catch (err) {
        console.error("Error resolving mess mapping:", err);
      }
    }

    if (!derivedMessId) {
      return NextResponse.json(
        {
          error: `Unable to derive assigned mess for hostel '${validatedData.hostel}'. Please ensure hostel mappings are seeded in database.`,
        },
        { status: 400 }
      );
    }

    // Check if student profile exists already
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id, is_profile_completed, assigned_mess_id, hostel")
      .eq("id", user.id)
      .maybeSingle();

    // Protection rule: If profile is already completed, student cannot modify assigned mess / hostel
    if (
      existingStudent &&
      existingStudent.is_profile_completed &&
      existingStudent.assigned_mess_id !== derivedMessId
    ) {
      return NextResponse.json(
        {
          error:
            "Protected Field: Students cannot modify their assigned mess or hostel after onboarding. Please contact mess administration.",
        },
        { status: 403 }
      );
    }

    // Upsert student record with canonical student_id, gender, and server-derived assigned_mess_id
    const { data: savedStudent, error: upsertError } = await supabase
      .from("students")
      .upsert(
        {
          id: user.id,
          student_id: validatedData.student_id,
          name: validatedData.name,
          email: user.email,
          gender: validatedData.gender,
          photo_url: validatedData.photo_url,
          hostel: validatedData.hostel,
          course: validatedData.course,
          year: validatedData.year,
          semester: validatedData.semester,
          assigned_mess_id: derivedMessId,
          account_status: "ACTIVE",
          is_profile_completed: true,
        },
        { onConflict: "id" }
      )
      .select("*, mess:messes(*)")
      .single();

    if (upsertError) {
      // Unique constraint violation on student_id
      if (upsertError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "This Student ID is already registered by another account. Please verify your Student ID.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Ensure STUDENT role is present in user_roles
    await supabase.from("user_roles").upsert(
      {
        user_id: user.id,
        role: "STUDENT",
      },
      { onConflict: "user_id,role" }
    );

    return NextResponse.json({
      success: true,
      message: "Mandatory student profile completed successfully.",
      student: savedStudent,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
