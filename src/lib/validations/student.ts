import { z } from "zod";
import { ALL_HOSTELS } from "../constants/hostels";

export const studentProfileSchema = z.object({
  student_id: z
    .string({ required_error: "Student ID is required" })
    .trim()
    .min(3, "Student ID must be at least 3 characters")
    .max(50, "Student ID cannot exceed 50 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Student ID can only contain letters, numbers, hyphens, and underscores"),
  name: z
    .string({ required_error: "Full Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name cannot exceed 150 characters"),
  gender: z.enum(["Male", "Female"], {
    required_error: "Gender is required",
    invalid_type_error: "Gender must be either 'Male' or 'Female'",
  }),
  hostel: z
    .string({ required_error: "Hostel is required" })
    .refine((val) => (ALL_HOSTELS as readonly string[]).includes(val), {
      message: "Please select a valid university hostel from the list",
    }),
  course: z
    .string({ required_error: "Course / Program is required" })
    .trim()
    .min(2, "Course is required")
    .max(100, "Course cannot exceed 100 characters"),
  year: z.coerce
    .number({ required_error: "Year of study is required" })
    .int("Year must be an integer")
    .min(1, "Year must be between 1 and 5")
    .max(5, "Year must be between 1 and 5"),
  semester: z.coerce
    .number({ required_error: "Semester is required" })
    .int("Semester must be an integer")
    .min(1, "Semester must be 1 or 2")
    .max(2, "Semester must be 1 or 2"),
  photo_url: z
    .string({ required_error: "Student photo is mandatory" })
    .min(1, "Student photo is mandatory"),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
