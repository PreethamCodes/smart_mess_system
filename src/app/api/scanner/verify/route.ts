import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";
import {
  MealType,
  EligibilityResult,
  StudentVerificationDetails,
} from "@/types/database";
import {
  isMealAvailableNow,
  getFormattedDate,
  REJECTION_MESSAGES,
} from "@/lib/meals/config";

export const dynamic = "force-dynamic";

/**
 * Server-Authoritative QR Meal Verification Engine
 * 
 * Executes the 6-step eligibility decision sequence:
 * 1. Check 1 — QR validity (lookup token in mess_credentials)
 * 2. Check 2 — Card status (ACTIVE vs BLOCKED vs DEACTIVATED)
 * 3. Check 3 — Correct mess (student assigned mess vs session mess)
 * 4. Check 4 — Student leave (is_on_leave flag)
 * 5. Check 5 — Meal already consumed (duplicate check for same meal & date)
 * 6. Check 6 — Meal availability (within configured meal time window)
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

    // Role Verification: Only Administrators can scan & verify meals
    const email = user.email?.toLowerCase();
    let isAdmin = isPreconfiguredAdminEmail(email);

    if (!isAdmin) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role === "ADMIN") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Meal scanning is restricted to authorized operators." },
        { status: 403 }
      );
    }

    // Parse Request Body
    const body = await request.json();
    const {
      qr_token,
      mess_id,
      meal_type,
      bypass_time_check = false,
    } = body as {
      qr_token: string;
      mess_id: string;
      meal_type: MealType;
      bypass_time_check?: boolean;
    };

    if (!qr_token || !mess_id || !meal_type) {
      return NextResponse.json(
        { error: "Missing required fields: qr_token, mess_id, and meal_type are mandatory." },
        { status: 400 }
      );
    }

    const cleanToken = qr_token.trim().toUpperCase();
    const today = getFormattedDate();
    const adminDb = createAdminClient();

    // -------------------------------------------------------------------------
    // CHECK 1 — QR Validity: Lookup credential by opaque token
    // -------------------------------------------------------------------------
    const { data: credential, error: credError } = await adminDb
      .from("mess_credentials")
      .select("id, student_id, credential_type, qr_token, status, block_reason")
      .eq("qr_token", cleanToken)
      .maybeSingle();

    if (credError || !credential) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.INVALID_CARD,
        rejectionCode: "INVALID_CARD",
        student: null,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // Fetch Student Profile & Mess Details
    const { data: studentRecord, error: studentError } = await adminDb
      .from("students")
      .select(`
        id,
        student_id,
        name,
        email,
        gender,
        photo_url,
        hostel,
        course,
        year,
        semester,
        assigned_mess_id,
        account_status,
        is_on_leave,
        mess:messes(name)
      `)
      .eq("id", credential.student_id)
      .maybeSingle();

    if (studentError || !studentRecord) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.STUDENT_MISMATCH,
        rejectionCode: "STUDENT_MISMATCH",
        student: null,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    const studentDetails: StudentVerificationDetails = {
      id: studentRecord.id,
      student_id: studentRecord.student_id,
      name: studentRecord.name,
      email: studentRecord.email,
      gender: studentRecord.gender,
      photo_url: studentRecord.photo_url,
      hostel: studentRecord.hostel,
      course: studentRecord.course,
      year: studentRecord.year,
      semester: studentRecord.semester,
      assigned_mess_id: studentRecord.assigned_mess_id,
      assigned_mess_name: (studentRecord.mess as any)?.name || "Assigned Mess",
      card_status: credential.status,
      is_on_leave: studentRecord.is_on_leave ?? false,
    };

    // -------------------------------------------------------------------------
    // CHECK 2 — Card Status (ACTIVE vs BLOCKED vs DEACTIVATED)
    // -------------------------------------------------------------------------
    if (credential.status === "BLOCKED") {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.BLOCKED_CARD,
        rejectionCode: "BLOCKED_CARD",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    if (credential.status === "DEACTIVATED") {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.DEACTIVATED_CARD,
        rejectionCode: "DEACTIVATED_CARD",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // -------------------------------------------------------------------------
    // CHECK 3 — Correct Mess Assignment
    // -------------------------------------------------------------------------
    if (studentRecord.assigned_mess_id !== mess_id) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.WRONG_MESS,
        rejectionCode: "WRONG_MESS",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // -------------------------------------------------------------------------
    // CHECK 4 — Student Leave Status
    // -------------------------------------------------------------------------
    if (studentRecord.is_on_leave) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.STUDENT_ON_LEAVE,
        rejectionCode: "STUDENT_ON_LEAVE",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // -------------------------------------------------------------------------
    // CHECK 5 — Meal Already Consumed (Duplicate Prevention for same date & meal)
    // -------------------------------------------------------------------------
    const { data: existingApprovedMeal, error: mealCheckError } = await adminDb
      .from("meal_transactions")
      .select("id, meal_type, meal_date, status, created_at")
      .eq("student_id", studentRecord.id)
      .eq("meal_type", meal_type)
      .eq("meal_date", today)
      .eq("status", "APPROVED")
      .maybeSingle();

    if (existingApprovedMeal) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.ALREADY_CONSUMED,
        rejectionCode: "ALREADY_CONSUMED",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // -------------------------------------------------------------------------
    // CHECK 6 — Meal Availability (Configured operational time window)
    // -------------------------------------------------------------------------
    const isAvailable = isMealAvailableNow(meal_type, new Date(), bypass_time_check);
    if (!isAvailable) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.MEAL_UNAVAILABLE,
        rejectionCode: "MEAL_UNAVAILABLE",
        student: studentDetails,
        scannedToken: cleanToken,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
      };
      return NextResponse.json(result);
    }

    // -------------------------------------------------------------------------
    // ALL CHECKS PASSED -> ELIGIBLE
    // -------------------------------------------------------------------------
    const result: EligibilityResult = {
      isEligible: true,
      status: "ELIGIBLE",
      rejectionReason: null,
      rejectionCode: null,
      student: studentDetails,
      scannedToken: cleanToken,
      sessionMessId: mess_id,
      mealType: meal_type,
      mealDate: today,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during meal verification" },
      { status: 500 }
    );
  }
}
