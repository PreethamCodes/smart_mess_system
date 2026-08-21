import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentProfileSchema } from "@/lib/validations/student";

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

    // Check if student profile exists already
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id, is_profile_completed, assigned_mess_id")
      .eq("id", user.id)
      .maybeSingle();

    // Protection rule: If profile is already completed, student cannot modify assigned_mess_id
    if (
      existingStudent &&
      existingStudent.is_profile_completed &&
      existingStudent.assigned_mess_id !== validatedData.assigned_mess_id
    ) {
      return NextResponse.json(
        {
          error:
            "Protected Field: Students cannot modify their assigned mess. Please contact mess administration.",
        },
        { status: 403 }
      );
    }

    // Verify assigned mess ID exists in messes table
    const { data: messRecord, error: messError } = await supabase
      .from("messes")
      .select("id, name, is_active")
      .eq("id", validatedData.assigned_mess_id)
      .maybeSingle();

    if (messError || !messRecord || !messRecord.is_active) {
      return NextResponse.json(
        { error: "Invalid or inactive assigned mess selected." },
        { status: 400 }
      );
    }

    // Upsert student record with canonical student_id
    const { data: savedStudent, error: upsertError } = await supabase
      .from("students")
      .upsert(
        {
          id: user.id,
          student_id: validatedData.student_id,
          name: validatedData.name,
          email: user.email,
          photo_url: validatedData.photo_url,
          hostel: validatedData.hostel,
          course: validatedData.course,
          year: validatedData.year,
          semester: validatedData.semester,
          assigned_mess_id: validatedData.assigned_mess_id,
          account_status: "ACTIVE",
          is_profile_completed: true,
        },
        { onConflict: "id" }
      )
      .select("*, mess:messes(*)")
      .single();

    if (upsertError) {
      // Check for unique constraint violation on student_id
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
