import { z } from "zod";

export const UNIVERSITY_DOMAIN = "uohyd.ac.in";

/**
 * Validates if an email string strictly belongs to the University domain (@uohyd.ac.in)
 */
export function isValidUniversityEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  // Regex: local-part @ uohyd.ac.in
  const uohydRegex = /^[a-zA-Z0-9._%+-]+@uohyd\.ac\.in$/i;
  return uohydRegex.test(trimmed);
}

export const universityEmailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Invalid email address format")
  .refine(isValidUniversityEmail, {
    message: "Only University of Hyderabad email addresses (@uohyd.ac.in) are permitted for signup.",
  });

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .regex(/[0-9]|[^a-zA-Z0-9]/, "Password must contain at least one number or special character");

export const signupSchema = z.object({
  email: universityEmailSchema,
  password: passwordSchema,
  confirmPassword: z.string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().email("Invalid email address"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const otpVerificationSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  token: z.string().trim().min(6, "Verification code must be at least 6 digits"),
  type: z.enum(["signup", "email", "recovery", "invite"]).default("signup"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpVerificationInput = z.infer<typeof otpVerificationSchema>;
