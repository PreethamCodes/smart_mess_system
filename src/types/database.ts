export type UserRoleType = "STUDENT" | "ADMIN";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type CredentialType = "QR" | "NFC";

export type CredentialStatus = "ACTIVE" | "BLOCKED" | "DEACTIVATED";

export type Gender = "Male" | "Female";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER";

export type MealTransactionStatus = "APPROVED" | "REJECTED";

export type RejectionReasonCode =
  | "INVALID_CARD"
  | "BLOCKED_CARD"
  | "DEACTIVATED_CARD"
  | "WRONG_MESS"
  | "STUDENT_ON_LEAVE"
  | "ALREADY_CONSUMED"
  | "MEAL_UNAVAILABLE"
  | "STUDENT_MISMATCH"
  | "OTHER";

export type ScannerState =
  | "IDLE"
  | "STARTING"
  | "SCANNING"
  | "PROCESSING"
  | "ELIGIBLE"
  | "REJECTED"
  | "FINALIZING";

export interface Mess {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HostelMessMapping {
  id: string;
  hostel_name: string;
  gender: Gender;
  mess_id: string;
  created_at: string;
  updated_at: string;
  mess?: Mess;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: UserRoleType;
  created_at: string;
}

export interface Student {
  id: string;
  student_id: string; // Single canonical university Student ID
  name: string;
  email: string;
  gender: Gender;
  photo_url: string | null;
  hostel: string;
  course: string;
  year: number; // 1 to 5
  semester: number; // 1 or 2 (within Year of Study)
  assigned_mess_id: string;
  account_status: AccountStatus;
  is_on_leave: boolean;
  is_profile_completed: boolean;
  created_at: string;
  updated_at: string;
  // Joined mess detail
  mess?: Mess;
}

export interface MessCredential {
  id: string;
  student_id: string;
  credential_type: CredentialType;
  qr_token: string;
  status: CredentialStatus;
  block_reason: string | null;
  blocked_at: string | null;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

export interface MealTransaction {
  id: string;
  student_id: string;
  mess_id: string;
  meal_type: MealType;
  meal_date: string; // YYYY-MM-DD
  status: MealTransactionStatus;
  rejection_reason: string | null;
  scanned_by: string | null;
  scanned_at: string;
  created_at: string;
  student?: Student;
  mess?: Mess;
}

export interface StudentVerificationDetails {
  id: string;
  student_id: string;
  name: string;
  email: string;
  gender: Gender;
  photo_url: string | null;
  hostel: string;
  course: string;
  year: number;
  semester: number;
  assigned_mess_id: string;
  assigned_mess_name: string;
  card_status: CredentialStatus;
  is_on_leave: boolean;
}

export interface EligibilityResult {
  isEligible: boolean;
  status: "ELIGIBLE" | "REJECTED";
  rejectionReason: string | null;
  rejectionCode: RejectionReasonCode | null;
  student: StudentVerificationDetails | null;
  scannedToken: string;
  sessionMessId: string;
  mealType: MealType;
  mealDate: string;
}

/**
 * Calculates absolute semester number (1 to 10) from Year of Study (1-5) and Semester within Year (1-2)
 */
export function getAbsoluteSemester(year: number, semester: number): number {
  return (year - 1) * 2 + semester;
}
