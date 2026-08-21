import { describe, it, expect } from "vitest";
import { studentProfileSchema } from "../src/lib/validations/student";
import { getAbsoluteSemester } from "../src/types/database";

describe("Student Profile & Mandatory Details Validation (Phase 1 Corrections)", () => {
  const validUUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  const sampleStudent = {
    student_id: "21MCMS01",
    name: "Rahul Sharma",
    hostel: "Men's Hostel J",
    course: "MCA",
    year: 2,
    semester: 2,
    assigned_mess_id: validUUID,
    photo_url: "https://example.com/photo.jpg",
  };

  it("should accept valid student profile with single canonical Student ID", () => {
    const res = studentProfileSchema.safeParse(sampleStudent);
    expect(res.success).toBe(true);
  });

  it("should reject student profile if mandatory photo is missing", () => {
    const res = studentProfileSchema.safeParse({
      ...sampleStudent,
      photo_url: "",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.flatten().fieldErrors.photo_url).toBeDefined();
    }
  });

  it("should reject invalid Student ID format or empty Student ID", () => {
    const resEmpty = studentProfileSchema.safeParse({
      ...sampleStudent,
      student_id: "",
    });
    expect(resEmpty.success).toBe(false);

    const resTooShort = studentProfileSchema.safeParse({
      ...sampleStudent,
      student_id: "ab",
    });
    expect(resTooShort.success).toBe(false);
  });

  it("should enforce assigned_mess_id must be a valid UUID", () => {
    const resInvalidUUID = studentProfileSchema.safeParse({
      ...sampleStudent,
      assigned_mess_id: "Mess 1", // Name string instead of UUID
    });
    expect(resInvalidUUID.success).toBe(false);
    if (!resInvalidUUID.success) {
      expect(resInvalidUUID.error.flatten().fieldErrors.assigned_mess_id).toBeDefined();
    }

    const resEmptyMess = studentProfileSchema.safeParse({
      ...sampleStudent,
      assigned_mess_id: "",
    });
    expect(resEmptyMess.success).toBe(false);
  });

  it("should enforce semester within year must be strictly 1 or 2", () => {
    const resSem1 = studentProfileSchema.safeParse({
      ...sampleStudent,
      semester: 1,
    });
    expect(resSem1.success).toBe(true);

    const resSem2 = studentProfileSchema.safeParse({
      ...sampleStudent,
      semester: 2,
    });
    expect(resSem2.success).toBe(true);

    const resSem3 = studentProfileSchema.safeParse({
      ...sampleStudent,
      semester: 3,
    });
    expect(resSem3.success).toBe(false);

    const resSem0 = studentProfileSchema.safeParse({
      ...sampleStudent,
      semester: 0,
    });
    expect(resSem0.success).toBe(false);
  });

  it("should enforce Year of Study is between 1 and 5", () => {
    expect(studentProfileSchema.safeParse({ ...sampleStudent, year: 1 }).success).toBe(true);
    expect(studentProfileSchema.safeParse({ ...sampleStudent, year: 5 }).success).toBe(true);
    expect(studentProfileSchema.safeParse({ ...sampleStudent, year: 0 }).success).toBe(false);
    expect(studentProfileSchema.safeParse({ ...sampleStudent, year: 6 }).success).toBe(false);
  });

  it("should calculate absolute semester correctly across all 5 years", () => {
    // 1st Year
    expect(getAbsoluteSemester(1, 1)).toBe(1);
    expect(getAbsoluteSemester(1, 2)).toBe(2);
    // 2nd Year
    expect(getAbsoluteSemester(2, 1)).toBe(3);
    expect(getAbsoluteSemester(2, 2)).toBe(4);
    // 3rd Year
    expect(getAbsoluteSemester(3, 1)).toBe(5);
    expect(getAbsoluteSemester(3, 2)).toBe(6);
    // 4th Year
    expect(getAbsoluteSemester(4, 1)).toBe(7);
    expect(getAbsoluteSemester(4, 2)).toBe(8);
    // 5th Year
    expect(getAbsoluteSemester(5, 1)).toBe(9);
    expect(getAbsoluteSemester(5, 2)).toBe(10);
  });

  it("should verify that obsolete fields university_id and registration_no are not in parsed schema", () => {
    const inputWithObsolete = {
      ...sampleStudent,
      university_id: "OLD_UNI_ID",
      registration_no: "OLD_REG_NO",
    };
    const parsed = studentProfileSchema.parse(inputWithObsolete) as any;
    expect(parsed.student_id).toBe("21MCMS01");
    expect(parsed.university_id).toBeUndefined();
    expect(parsed.registration_no).toBeUndefined();
  });
});
