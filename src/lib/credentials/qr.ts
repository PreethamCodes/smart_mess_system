import crypto from "crypto";

/**
 * Generates an opaque, cryptographically secure QR token.
 * Example format: MESS-CARD-8F72A91C or MESS-CARD-A1B2-C3D4-E5F6-7890
 * 
 * IMPORTANT: The QR payload MUST NOT encode any personally identifiable information (PII)
 * such as student name, Student ID, hostel, or photo.
 */
export function generateOpaqueQRToken(): string {
  // 8 random bytes = 16 hex characters for high entropy and uniqueness
  const randomHex = crypto.randomBytes(8).toString("hex").toUpperCase();
  const chunk1 = randomHex.slice(0, 4);
  const chunk2 = randomHex.slice(4, 8);
  const chunk3 = randomHex.slice(8, 12);
  const chunk4 = randomHex.slice(12, 16);
  return `MESS-CARD-${chunk1}-${chunk2}-${chunk3}-${chunk4}`;
}

/**
 * Validates whether a given string adheres to the opaque QR token format
 */
export function isValidQRTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  // Matches MESS-CARD-XXXX-XXXX-XXXX-XXXX or MESS-CARD-XXXXXXXX
  const regex = /^MESS-CARD-([A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}|[A-F0-9]{8,32})$/;
  return regex.test(token.trim().toUpperCase());
}

/**
 * Inspects a QR payload to ensure it DOES NOT leak personal information
 */
export function doesPayloadContainPII(payload: string, studentData?: {
  name?: string;
  student_id?: string;
  email?: string;
  hostel?: string;
}): boolean {
  if (!payload || !studentData) return false;
  const lowerPayload = payload.toLowerCase();
  
  if (studentData.name && studentData.name.length > 2 && lowerPayload.includes(studentData.name.toLowerCase())) {
    return true;
  }
  if (studentData.student_id && lowerPayload.includes(studentData.student_id.toLowerCase())) {
    return true;
  }
  if (studentData.email && lowerPayload.includes(studentData.email.toLowerCase())) {
    return true;
  }
  if (studentData.hostel && studentData.hostel.length > 3 && lowerPayload.includes(studentData.hostel.toLowerCase())) {
    return true;
  }
  
  return false;
}
