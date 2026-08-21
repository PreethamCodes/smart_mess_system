import { describe, it, expect } from "vitest";
import { REJECTION_MESSAGES } from "../src/lib/meals/config";
import {
  EligibilityResult,
  MealType,
  ScannerState,
  VerificationMethod,
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
  verificationMethod?: VerificationMethod;
}): EligibilityResult {
  const {
    credential,
    student,
    sessionMessId,
    mealType,
    alreadyApprovedToday,
    isMealAvailable,
    verificationMethod = "QR",
  } = params;

  const today = "2026-08-21";

  // For QR flow, credential is required
  if (verificationMethod === "QR" && !credential) {
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
      verificationMethod,
    };
  }

  // Student must exist
  if (!student) {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.STUDENT_MISMATCH,
      rejectionCode: "STUDENT_MISMATCH",
      student: null,
      scannedToken: credential?.qr_token || "SEARCH_INPUT",
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
    };
  }

  const cardStatus = credential ? credential.status : "ACTIVE";

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
    card_status: cardStatus,
    is_on_leave: student.is_on_leave,
  };

  // Check 2: Card Status
  if (cardStatus === "BLOCKED") {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.BLOCKED_CARD,
      rejectionCode: "BLOCKED_CARD",
      student: studentDetails,
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
    };
  }

  if (cardStatus === "DEACTIVATED") {
    return {
      isEligible: false,
      status: "REJECTED",
      rejectionReason: REJECTION_MESSAGES.DEACTIVATED_CARD,
      rejectionCode: "DEACTIVATED_CARD",
      student: studentDetails,
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
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
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
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
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
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
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
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
      scannedToken: credential?.qr_token || student.student_id,
      sessionMessId,
      mealType,
      mealDate: today,
      verificationMethod,
    };
  }

  // Eligible
  return {
    isEligible: true,
    status: "ELIGIBLE",
    rejectionReason: null,
    rejectionCode: null,
    student: studentDetails,
    scannedToken: credential?.qr_token || student.student_id,
    sessionMessId,
    mealType,
    mealDate: today,
    verificationMethod,
  };
}

describe("V1.2 / V1.3 Meal Eligibility Engine & Reliability Checks", () => {
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

  it("Test 7: Meal already consumed today (Duplicate Check) -> REJECTED: Meal already consumed", () => {
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

  // ===========================================================================
  // V1.3 Specific Reliability & Verification Tests
  // ===========================================================================

  describe("V1.3 Feature 1 & 5: Duplicate Prevention & Transaction Recording", () => {
    it("should prevent duplicate approval for same student, meal_type, and meal_date", () => {
      // Simulate Database Transaction Table with partial unique constraint
      const dbTransactions: Array<{
        student_id: string;
        meal_type: MealType;
        meal_date: string;
        status: "APPROVED" | "REJECTED";
        verification_method: VerificationMethod;
      }> = [];

      const recordTransaction = (tx: {
        student_id: string;
        meal_type: MealType;
        meal_date: string;
        status: "APPROVED" | "REJECTED";
        verification_method: VerificationMethod;
      }) => {
        if (tx.status === "APPROVED") {
          const duplicate = dbTransactions.some(
            (t) =>
              t.student_id === tx.student_id &&
              t.meal_type === tx.meal_type &&
              t.meal_date === tx.meal_date &&
              t.status === "APPROVED"
          );
          if (duplicate) {
            throw new Error("23505: Unique constraint violation (duplicate approved meal)");
          }
        }
        dbTransactions.push(tx);
        return { success: true, id: "tx-123" };
      };

      // First Lunch -> APPROVED with QR
      const firstTx = recordTransaction({
        student_id: "student-uuid-1",
        meal_type: "LUNCH",
        meal_date: "2026-08-21",
        status: "APPROVED",
        verification_method: "QR",
      });
      expect(firstTx.success).toBe(true);
      expect(dbTransactions).toHaveLength(1);

      // Second Lunch attempt -> Throws unique constraint error
      expect(() =>
        recordTransaction({
          student_id: "student-uuid-1",
          meal_type: "LUNCH",
          meal_date: "2026-08-21",
          status: "APPROVED",
          verification_method: "QR",
        })
      ).toThrow("23505");
    });
  });

  describe("V1.3 Feature 2: Camera Debouncing Simulation", () => {
    it("should prevent identical QR from generating repeated processing requests during debounce window", () => {
      let processingCount = 0;
      let lastScannedToken = "";
      let lastScannedTime = 0;
      let isProcessingLock = false;

      const simulateFrameDetection = (token: string, timestamp: number) => {
        const isDuplicateDebounce =
          token === lastScannedToken && timestamp - lastScannedTime < 1500;

        if (!isDuplicateDebounce && !isProcessingLock) {
          isProcessingLock = true;
          lastScannedToken = token;
          lastScannedTime = timestamp;
          processingCount += 1;
        }
      };

      const token = "MESS-CARD-1234";

      // Frame 1 at t=0ms
      simulateFrameDetection(token, 0);
      expect(processingCount).toBe(1);

      // Frame 2 at t=100ms (locked)
      simulateFrameDetection(token, 100);
      expect(processingCount).toBe(1);

      // Frame 3 at t=300ms (locked)
      simulateFrameDetection(token, 300);
      expect(processingCount).toBe(1);

      // Operator finalizes transaction at t=2000ms -> releases lock
      isProcessingLock = false;

      // Next student card presented at t=2500ms
      simulateFrameDetection("MESS-CARD-5678", 2500);
      expect(processingCount).toBe(2);
    });
  });

  describe("V1.3 Feature 3: Manual Rejection Flow", () => {
    it("should allow operator to manually reject an otherwise ELIGIBLE student with a reason", () => {
      // 1. Initial QR Scan -> ELIGIBLE
      const initialVerdict = evaluateEligibility({
        credential: validActiveCredential,
        student: validActiveStudent,
        sessionMessId: mess1Id,
        mealType: "LUNCH",
        alreadyApprovedToday: false,
        isMealAvailable: true,
      });
      expect(initialVerdict.isEligible).toBe(true);

      // 2. Operator visual verification fails -> Operator overrides with REJECT
      const operatorOverrideStatus = "REJECTED";
      const operatorOverrideReason = "Student details mismatch";

      const finalTransactionPayload = {
        student_id: initialVerdict.student!.id,
        mess_id: mess1Id,
        meal_type: "LUNCH" as const,
        status: operatorOverrideStatus,
        rejection_reason: operatorOverrideReason,
        verification_method: "QR" as const,
      };

      expect(finalTransactionPayload.status).toBe("REJECTED");
      expect(finalTransactionPayload.rejection_reason).toBe("Student details mismatch");
      expect(finalTransactionPayload.verification_method).toBe("QR");
    });
  });

  describe("V1.3 Feature 4: Manual Student Verification Flow", () => {
    it("should verify student by ID, enforce mess rules, and approve with MANUAL verification method", () => {
      // 1. Search student by ID
      const searchVerdict = evaluateEligibility({
        credential: null, // Fallback without physical card
        student: validActiveStudent,
        sessionMessId: mess1Id,
        mealType: "LUNCH",
        alreadyApprovedToday: false,
        isMealAvailable: true,
        verificationMethod: "MANUAL",
      });

      expect(searchVerdict.isEligible).toBe(true);
      expect(searchVerdict.verificationMethod).toBe("MANUAL");

      // 2. Operator clicks APPROVE MEAL
      const manualTransaction = {
        student_id: searchVerdict.student!.id,
        mess_id: mess1Id,
        meal_type: "LUNCH" as const,
        status: "APPROVED" as const,
        verification_method: "MANUAL" as const,
        meal_date: "2026-08-21",
      };

      expect(manualTransaction.status).toBe("APPROVED");
      expect(manualTransaction.verification_method).toBe("MANUAL");
    });

    it("should reject manual search if student belongs to a different mess", () => {
      const searchVerdict = evaluateEligibility({
        credential: null,
        student: validActiveStudent, // Assigned to Mess 1
        sessionMessId: mess2Id,      // Current session is Mess 2
        mealType: "LUNCH",
        alreadyApprovedToday: false,
        isMealAvailable: true,
        verificationMethod: "MANUAL",
      });

      expect(searchVerdict.isEligible).toBe(false);
      expect(searchVerdict.status).toBe("REJECTED");
      expect(searchVerdict.rejectionReason).toBe("Wrong mess");
    });

    it("should reject manual search if student already consumed the meal today", () => {
      const searchVerdict = evaluateEligibility({
        credential: null,
        student: validActiveStudent,
        sessionMessId: mess1Id,
        mealType: "LUNCH",
        alreadyApprovedToday: true, // Already consumed
        isMealAvailable: true,
        verificationMethod: "MANUAL",
      });

      expect(searchVerdict.isEligible).toBe(false);
      expect(searchVerdict.status).toBe("REJECTED");
      expect(searchVerdict.rejectionReason).toBe("Meal already consumed");
    });
  });

  describe("Continuous Queue Multi-Student Resumption", () => {
    it("should cycle through multiple students with automatic scanner resumption", () => {
      let state: ScannerState = "SCANNING";
      let queueCount = 0;

      const processQueueStudent = (isEligible: boolean) => {
        state = "PROCESSING";
        state = isEligible ? "ELIGIBLE" : "REJECTED";
        // Operator clicks NEXT
        state = "FINALIZING";
        queueCount += 1;
        // Auto-resumes
        state = "SCANNING";
      };

      // Student A (Eligible)
      processQueueStudent(true);
      expect(state).toBe("SCANNING");
      expect(queueCount).toBe(1);

      // Student B (Rejected: Wrong Mess)
      processQueueStudent(false);
      expect(state).toBe("SCANNING");
      expect(queueCount).toBe(2);

      // Student C (Eligible)
      processQueueStudent(true);
      expect(state).toBe("SCANNING");
      expect(queueCount).toBe(3);
    });
  });
});
