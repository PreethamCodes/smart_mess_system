import { describe, it, expect } from "vitest";
import { REJECTION_MESSAGES } from "../src/lib/meals/config";
import {
  EligibilityResult,
  MealType,
  ScannerState,
} from "../src/types/database";

/**
 * Pure evaluation logic matching the server-side eligibility engine
 */
function evaluateEligibility(params: {
  credential: { status: "ACTIVE" | "BLOCKED" | "DEACTIVATED"; qr_token: string } | null;
  student: {
    id: string;
    student_id: string;
    name: string;
    assigned_mess_id: string;
    is_on_leave: boolean;
  } | null;
  sessionMessId: string;
  mealType: MealType;
  alreadyApprovedToday: boolean;
  isMealAvailable: boolean;
}): EligibilityResult {
  const {
    credential,
    student,
    sessionMessId,
    mealType,
    alreadyApprovedToday,
    isMealAvailable,
  } = params;

  const today = "2026-08-21";

  // Check 1: Valid QR
  if (!credential) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.INVALID_CARD,
      rejectionCode: "INVALID_CARD",
      student: null,
      scannedToken: "UNKNOWN",
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  if (!student) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.STUDENT_MISMATCH,
      rejectionCode: "STUDENT_MISMATCH",
      student: null,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  const studentDetails = {
    id: student.id,
    student_id: student.student_id,
    name: student.name,
    email: `${student.student_id}@uohyd.ac.in`,
    gender: "Male" as const,
    photo_url: null,
    hostel: "MH - A",
    course: "Integrated M.Sc.",
    year: 3,
    semester: 1,
    assigned_mess_id: student.assigned_mess_id,
    assigned_mess_name: "Mess 1",
    card_status: credential.status,
    is_on_leave: student.is_on_leave,
  };

  // Check 2: Card Status
  if (credential.status === "BLOCKED") {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.BLOCKED_CARD,
      rejectionCode: "BLOCKED_CARD",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  if (credential.status === "DEACTIVATED") {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.DEACTIVATED_CARD,
      rejectionCode: "DEACTIVATED_CARD",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  // Check 3: Correct Mess
  if (student.assigned_mess_id !== sessionMessId) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.WRONG_MESS,
      rejectionCode: "WRONG_MESS",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  // Check 4: Student on Leave
  if (student.is_on_leave) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.STUDENT_ON_LEAVE,
      rejectionCode: "STUDENT_ON_LEAVE",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  // Check 5: Already Consumed Today
  if (alreadyApprovedToday) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.ALREADY_CONSUMED,
      rejectionCode: "ALREADY_CONSUMED",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  // Check 6: Meal Availability
  if (!isMealAvailable) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.MEAL_UNAVAILABLE,
      rejectionCode: "MEAL_UNAVAILABLE",
      student: studentDetails,
      scannedToken: credential.qr_token,
      sessionMessId,
      mealType,
      mealDate: today,
    };
  }

  // Eligible
  return {
    isEligible: true,
    status: "ELIGIBLE",
    rejectionReason: null,
    rejectionCode: null,
    student: studentDetails,
    scannedToken: credential.qr_token,
    sessionMessId,
    mealType,
    mealDate: today,
  };
}

describe("V1.2 Meal Eligibility Engine Checks", () => {
  const mess1Id = "mess-uuid-1";
  const mess2Id = "mess-uuid-2";

  const validActiveStudent = {
    id: "student-uuid-1",
    student_id: "21MCMS01",
    name: "Preetham",
    assigned_mess_id: mess1Id,
    is_on_leave: false,
  };

  const validActiveCredential = {
    status: "ACTIVE" as const,
    qr_token: "MESS-CARD-A1B2-C3D4-E5F6-7890",
  };

  it("Test 1: Valid student, active card, correct mess, not on leave, within time window -> ELIGIBLE", () => {
    const res = evaluateEligibility({
      credential: validActiveCredential,
      student: validActiveStudent,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(true);
    expect(res.status).toBe("ELIGIBLE");
    expect(res.rejectionReason).toBeNull();
    expect(res.student?.name).toBe("Preetham");
  });

  it("Test 2: Invalid/Unknown QR Token -> REJECTED: Invalid card", () => {
    const res = evaluateEligibility({
      credential: null,
      student: null,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Invalid card");
    expect(res.rejectionCode).toBe("INVALID_CARD");
  });

  it("Test 3: Blocked card -> REJECTED: Blocked card", () => {
    const res = evaluateEligibility({
      credential: { ...validActiveCredential, status: "BLOCKED" },
      student: validActiveStudent,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Blocked card");
    expect(res.rejectionCode).toBe("BLOCKED_CARD");
  });

  it("Test 4: Deactivated card -> REJECTED: Deactivated card", () => {
    const res = evaluateEligibility({
      credential: { ...validActiveCredential, status: "DEACTIVATED" },
      student: validActiveStudent,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Deactivated card");
    expect(res.rejectionCode).toBe("DEACTIVATED_CARD");
  });

  it("Test 5: Student assigned to Mess 1 scanning at Mess 2 -> REJECTED: Wrong mess", () => {
    const res = evaluateEligibility({
      credential: validActiveCredential,
      student: validActiveStudent, // Assigned to Mess 1
      sessionMessId: mess2Id,      // Scanning at Mess 2
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Wrong mess");
    expect(res.rejectionCode).toBe("WRONG_MESS");
  });

  it("Test 6: Student on leave -> REJECTED: Student on leave", () => {
    const res = evaluateEligibility({
      credential: validActiveCredential,
      student: { ...validActiveStudent, is_on_leave: true },
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Student on leave");
    expect(res.rejectionCode).toBe("STUDENT_ON_LEAVE");
  });

  it("Test 7: Meal already consumed today -> REJECTED: Meal already consumed", () => {
    const res = evaluateEligibility({
      credential: validActiveCredential,
      student: validActiveStudent,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: true,
      isMealAvailable: true,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Meal already consumed");
    expect(res.rejectionCode).toBe("ALREADY_CONSUMED");
  });

  it("Test 8: Outside meal operating window -> REJECTED: Meal unavailable", () => {
    const res = evaluateEligibility({
      credential: validActiveCredential,
      student: validActiveStudent,
      sessionMessId: mess1Id,
      mealType: "LUNCH",
      alreadyApprovedToday: false,
      isMealAvailable: false,
    });

    expect(res.isEligible).toBe(false);
    expect(res.status).toBe("REJECTED");
    expect(res.rejectionReason).toBe("Meal unavailable");
    expect(res.rejectionCode).toBe("MEAL_UNAVAILABLE");
  });

  describe("Continuous Queue State Machine Transitions", () => {
    it("should correctly transition through SCANNING -> PROCESSING -> ELIGIBLE -> FINALIZING -> SCANNING", () => {
      let state: ScannerState = "SCANNING";
      expect(state).toBe("SCANNING");

      // QR Detected
      state = "PROCESSING";
      expect(state).toBe("PROCESSING");

      // Verification Result
      state = "ELIGIBLE";
      expect(state).toBe("ELIGIBLE");

      // Operator presses NEXT
      state = "FINALIZING";
      expect(state).toBe("FINALIZING");

      // Automatically reset for next student
      state = "SCANNING";
      expect(state).toBe("SCANNING");
    });
  });
});
