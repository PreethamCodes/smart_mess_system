import { describe, it, expect } from "vitest";
import {
  isValidUniversityEmail,
  universityEmailSchema,
  signupSchema,
  loginSchema,
} from "../src/lib/validations/auth";

describe("University Email & Authentication Validations", () => {
  describe("University Email Domain Validation (@uohyd.ac.in)", () => {
    it("should accept valid @uohyd.ac.in emails", () => {
      expect(isValidUniversityEmail("student@uohyd.ac.in")).toBe(true);
      expect(isValidUniversityEmail("preetham.21@uohyd.ac.in")).toBe(true);
      expect(isValidUniversityEmail("admin@uohyd.ac.in")).toBe(true);
      expect(isValidUniversityEmail("STUDENT@UOHYD.AC.IN")).toBe(true);
      expect(isValidUniversityEmail("first.last_123@uohyd.ac.in")).toBe(true);
    });

    it("should reject non-university email domains", () => {
      expect(isValidUniversityEmail("student@gmail.com")).toBe(false);
      expect(isValidUniversityEmail("student@yahoo.com")).toBe(false);
      expect(isValidUniversityEmail("student@outlook.com")).toBe(false);
      expect(isValidUniversityEmail("student@uohyd.edu")).toBe(false);
      expect(isValidUniversityEmail("student@uohyd.com")).toBe(false);
      expect(isValidUniversityEmail("student@uohyd.ac.in.attacker.com")).toBe(false);
      expect(isValidUniversityEmail("attacker@fakeuohyd.ac.in")).toBe(false);
      expect(isValidUniversityEmail("")).toBe(false);
    });

    it("should validate zod universityEmailSchema successfully", () => {
      const valid = universityEmailSchema.safeParse("user@uohyd.ac.in");
      expect(valid.success).toBe(true);

      const invalid = universityEmailSchema.safeParse("user@external.com");
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.errors[0].message).toContain("@uohyd.ac.in");
      }
    });
  });

  describe("Signup Schema Validation", () => {
    it("should accept valid signup credentials", () => {
      const res = signupSchema.safeParse({
        email: "student@uohyd.ac.in",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      });
      expect(res.success).toBe(true);
    });

    it("should reject short password (< 8 chars)", () => {
      const res = signupSchema.safeParse({
        email: "student@uohyd.ac.in",
        password: "Pass1",
        confirmPassword: "Pass1",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain("at least 8 characters");
      }
    });

    it("should reject mismatched passwords", () => {
      const res = signupSchema.safeParse({
        email: "student@uohyd.ac.in",
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.errors[0].message).toContain("Passwords do not match");
      }
    });
  });

  describe("Login Schema Validation", () => {
    it("should validate login input properly", () => {
      const valid = loginSchema.safeParse({
        email: "student@uohyd.ac.in",
        password: "ValidPassword123",
      });
      expect(valid.success).toBe(true);

      const invalid = loginSchema.safeParse({
        email: "not-an-email",
        password: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Numeric OTP Token Formatting & Validation", () => {
    it("should validate 6-digit numeric OTP strings", () => {
      const isValidOTP = (token: string) => /^\d{6}$/.test(token.trim());
      expect(isValidOTP("123456")).toBe(true);
      expect(isValidOTP("000000")).toBe(true);
      expect(isValidOTP("987654")).toBe(true);
      expect(isValidOTP("12345")).toBe(false);
      expect(isValidOTP("1234567")).toBe(false);
      expect(isValidOTP("12345A")).toBe(false);
      expect(isValidOTP("")).toBe(false);
    });

    it("should correctly sanitize numeric OTP input by stripping spaces and non-digits", () => {
      const sanitizeOTP = (raw: string) => raw.replace(/[^0-9]/g, "").slice(0, 6);
      expect(sanitizeOTP(" 123 456 ")).toBe("123456");
      expect(sanitizeOTP("12-34-56")).toBe("123456");
      expect(sanitizeOTP("abc123def456")).toBe("123456");
    });
  });
});
