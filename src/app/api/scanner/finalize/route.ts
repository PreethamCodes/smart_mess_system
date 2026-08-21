import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";
import { MealType, MealTransactionStatus, VerificationMethod } from "@/types/database";
import { getFormattedDate } from "@/lib/meals/config";

export const dynamic = "force-dynamic";

/**
 * Meal Transaction Finalization Endpoint (V1.3 Reliable Recording)
 * 
 * Invoked when the operator clicks NEXT or APPROVE MEAL to finalize:
 * 1. Persists transaction audit record with verification_method ('QR' vs 'MANUAL').
 * 2. Enforces partial unique index for APPROVED meals on the same date (database-level concurrency safety).
 * 3. Returns the finalized transaction metadata.
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

    // Role Verification: Only Administrators can finalize transactions
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
        { error: "Forbidden. Only authorized operators can finalize meal transactions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      student_id,
      mess_id,
      meal_type,
      status,
      verification_method = "QR",
      rejection_reason = null,
      meal_date,
    } = body as {
      student_id: string;
      mess_id: string;
      meal_type: MealType;
      status: MealTransactionStatus;
      verification_method?: VerificationMethod;
      rejection_reason?: string | null;
      meal_date?: string;
    };

    if (!student_id || !mess_id || !meal_type || !status) {
      return NextResponse.json(
        { error: "Missing required fields: student_id, mess_id, meal_type, and status are mandatory." },
        { status: 400 }
      );
    }

    const dateToRecord = meal_date || getFormattedDate();
    const adminDb = createAdminClient();

    // 1. If approving, check if already approved (concurrent safety check)
    if (status === "APPROVED") {
      const { data: existingApproved } = await adminDb
        .from("meal_transactions")
        .select("id")
        .eq("student_id", student_id)
        .eq("meal_type", meal_type)
        .eq("meal_date", dateToRecord)
        .eq("status", "APPROVED")
        .maybeSingle();

      if (existingApproved) {
        return NextResponse.json(
          {
            success: false,
            error: "Meal already consumed for this date and time window.",
            alreadyConsumed: true,
          },
          { status: 409 }
        );
      }
    }

    // 2. Insert Finalized Transaction with Verification Method
    const { data: transaction, error: insertError } = await adminDb
      .from("meal_transactions")
      .insert({
        student_id,
        mess_id,
        meal_type,
        meal_date: dateToRecord,
        status,
        verification_method: verification_method === "MANUAL" ? "MANUAL" : "QR",
        rejection_reason: status === "REJECTED" ? rejection_reason : null,
        scanned_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique index violation code (23505)
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Meal already consumed for this date and time window.",
            alreadyConsumed: true,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: `Failed to record transaction: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      studentId: student_id,
      messId: mess_id,
      mealType: meal_type,
      mealDate: dateToRecord,
      status: transaction.status,
      verificationMethod: transaction.verification_method,
      scannedAt: transaction.scanned_at,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error during transaction finalization" },
      { status: 500 }
    );
  }
}
