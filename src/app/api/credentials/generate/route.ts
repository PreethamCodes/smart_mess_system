import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateOpaqueQRToken, doesPayloadContainPII } from "@/lib/credentials/qr";

/**
 * Server-Side QR Credential Generation Endpoint
 * 
 * Rules:
 * 1. User must be authenticated.
 * 2. Student profile must be complete.
 * 3. Idempotency: If an ACTIVE credential already exists for this student, return it.
 * 4. Opaque Token: Generated token MUST NOT encode any PII.
 * 5. Database constraint prevents duplicate active cards.
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

    // 1. Fetch Student Profile
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, student_id, email, hostel, is_profile_completed, assigned_mess_id")
      .eq("id", user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // 2. Validate Profile Completion
    if (!student.is_profile_completed) {
      return NextResponse.json(
        {
          error:
            "Mandatory student profile details must be completed before generating a QR credential.",
        },
        { status: 400 }
      );
    }

    // 3. Check for Existing ACTIVE Credential
    const { data: existingActiveCredential, error: credCheckError } = await supabase
      .from("mess_credentials")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (credCheckError && credCheckError.code !== "PGRST116") {
      return NextResponse.json(
        { error: `Database error checking credentials: ${credCheckError.message}` },
        { status: 500 }
      );
    }

    // If active credential already exists, return it (Idempotent behavior)
    if (existingActiveCredential) {
      return NextResponse.json({
        success: true,
        isNew: false,
        message: "Active QR card retrieved successfully.",
        credential: existingActiveCredential,
      });
    }

    // 4. Generate a Cryptographically Secure Opaque Token
    const qrToken = generateOpaqueQRToken();

    // Verify no personal information is encoded in the QR payload
    const containsPII = doesPayloadContainPII(qrToken, {
      name: student.name,
      student_id: student.student_id,
      email: student.email,
      hostel: student.hostel,
    });

    if (containsPII) {
      return NextResponse.json(
        { error: "Security check failed: Generated token contained PII." },
        { status: 500 }
      );
    }

    // 5. Insert New Credential
    const { data: newCredential, error: insertError } = await supabase
      .from("mess_credentials")
      .insert({
        student_id: user.id,
        credential_type: "QR",
        qr_token: qrToken,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (insertError) {
      // If a concurrent request created an active credential (partial unique constraint violation)
      if (insertError.code === "23505") {
        const { data: retryActive } = await supabase
          .from("mess_credentials")
          .select("*")
          .eq("student_id", user.id)
          .eq("status", "ACTIVE")
          .single();

        return NextResponse.json({
          success: true,
          isNew: false,
          message: "Existing active QR card retrieved.",
          credential: retryActive,
        });
      }

      return NextResponse.json(
        { error: `Failed to create mess credential: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isNew: true,
      message: "Unique QR credential successfully generated.",
      credential: newCredential,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET Handler: Retrieve current active credential for authenticated student
 */
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

    const { data: credential, error } = await supabase
      .from("mess_credentials")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      hasCredential: !!credential,
      credential: credential || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
