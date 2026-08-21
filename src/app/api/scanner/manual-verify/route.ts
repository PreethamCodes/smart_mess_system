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
 * Manual Student Verification Endpoint (V1.3 Fallback Workflow)
 * 
 * Invoked when physical QR cannot be scanned:
 * 1. Resolves student record by canonical Student ID (e.g. "21MCMS01").
 * 2. Checks account and card status.
 * 3. Enforces session mess matching (student assigned mess vs session mess).
 * 4. Checks leave status.
 * 5. Checks for duplicate meal consumption today.
 * 6. Checks meal availability window.
 * 7. Returns structured eligibility verdict with verificationMethod: 'MANUAL'.
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

    // Role Verification: Only Administrators can perform manual student verification
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
        { error: "Forbidden. Manual meal verification is restricted to authorized operators." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      student_id_input,
      mess_id,
      meal_type,
      bypass_time_check = false,
    } = body as {
      student_id_input: string;
      mess_id: string;
      meal_type: MealType;
      bypass_time_check?: boolean;
    };

    if (!student_id_input || !mess_id || !meal_type) {
      return NextResponse.json(
        { error: "Missing required fields: student_id_input, mess_id, and meal_type are mandatory." },
        { status: 400 }
      );
    }

    const cleanStudentId = student_id_input.trim().toUpperCase();
    const today = getFormattedDate();
    const adminDb = createAdminClient();

    // 1. Search Student by canonical student_id
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
        is_profile_completed,
        mess:messes(name)
      `)
      .ilike("student_id", cleanStudentId)
      .maybeSingle();

    if (studentError || !studentRecord) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: "Student ID not found in university registry.",
        rejectionCode: "STUDENT_MISMATCH",
        student: null,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // 2. Fetch Active Mess Credential for Card Status
    const { data: credential } = await adminDb
      .from("mess_credentials")
      .select("status, qr_token")
      .eq("student_id", studentRecord.id)
      .maybeSingle();

    const cardStatus = credential?.status || "ACTIVE";

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
      card_status: cardStatus,
      is_on_leave: studentRecord.is_on_leave ?? false,
    };

    // Check Account Status
    if (studentRecord.account_status !== "ACTIVE" || cardStatus === "BLOCKED") {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.BLOCKED_CARD,
        rejectionCode: "BLOCKED_CARD",
        student: studentDetails,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    if (cardStatus === "DEACTIVATED") {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.DEACTIVATED_CARD,
        rejectionCode: "DEACTIVATED_CARD",
        student: studentDetails,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // 3. Check Correct Mess Assignment
    if (studentRecord.assigned_mess_id !== mess_id) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.WRONG_MESS,
        rejectionCode: "WRONG_MESS",
        student: studentDetails,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // 4. Check Student Leave Status
    if (studentRecord.is_on_leave) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.STUDENT_ON_LEAVE,
        rejectionCode: "STUDENT_ON_LEAVE",
        student: studentDetails,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // 5. Check Duplicate Consumption Today
    const { data: existingApprovedMeal } = await adminDb
      .from("meal_transactions")
      .select("id")
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
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // 6. Check Meal Window Availability
    const isAvailable = isMealAvailableNow(meal_type, new Date(), bypass_time_check);
    if (!isAvailable) {
      const result: EligibilityResult = {
        isEligible: false,
        status: "REJECTED",
        rejectionReason: REJECTION_MESSAGES.MEAL_UNAVAILABLE,
        rejectionCode: "MEAL_UNAVAILABLE",
        student: studentDetails,
        scannedToken: cleanStudentId,
        sessionMessId: mess_id,
        mealType: meal_type,
        mealDate: today,
        verificationMethod: "MANUAL",
      };
      return NextResponse.json(result);
    }

    // All Checks Passed -> ELIGIBLE
    const result: EligibilityResult = {
      isEligible: true,
      status: "ELIGIBLE",
      rejectionReason: null,
      rejectionCode: null,
      student: studentDetails,
      scannedToken: cleanStudentId,
      sessionMessId: mess_id,
      mealType: meal_type,
      mealDate: today,
      verificationMethod: "MANUAL",
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during manual student verification" },
      { status: 500 }
    );
  }
}
