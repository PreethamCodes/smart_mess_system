import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isPreconfiguredAdminEmail,
  hasRequiredRole,
  determineUserRoleAndRouting,
} from "../src/lib/auth/roles";

describe("Role Authorization & Admin Bootstrap Validation", () => {
  const originalEnv = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "admin@uohyd.ac.in,superadmin@uohyd.ac.in,messhead@uohyd.ac.in";
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalEnv;
  });

  it("should recognize authorized emails from ADMIN_EMAILS configuration", () => {
    expect(isPreconfiguredAdminEmail("admin@uohyd.ac.in")).toBe(true);
    expect(isPreconfiguredAdminEmail("ADMIN@UOHYD.AC.IN")).toBe(true);
    expect(isPreconfiguredAdminEmail("superadmin@uohyd.ac.in")).toBe(true);
    expect(isPreconfiguredAdminEmail("messhead@uohyd.ac.in")).toBe(true);
  });

  it("should reject unauthorized student emails from admin bootstrap", () => {
    expect(isPreconfiguredAdminEmail("student@uohyd.ac.in")).toBe(false);
    expect(isPreconfiguredAdminEmail("random.user@uohyd.ac.in")).toBe(false);
    expect(isPreconfiguredAdminEmail("")).toBe(false);
    expect(isPreconfiguredAdminEmail(null)).toBe(false);
    expect(isPreconfiguredAdminEmail(undefined)).toBe(false);
  });

  it("should correctly check role permissions using hasRequiredRole", () => {
    // Admin user has access to both ADMIN and STUDENT areas
    expect(hasRequiredRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRequiredRole("ADMIN", "STUDENT")).toBe(true);

    // Student user only has access to STUDENT areas
    expect(hasRequiredRole("STUDENT", "STUDENT")).toBe(true);
    expect(hasRequiredRole("STUDENT", "ADMIN")).toBe(false);

    // Null/undefined role has no access
    expect(hasRequiredRole(null, "STUDENT")).toBe(false);
    expect(hasRequiredRole(null, "ADMIN")).toBe(false);
    expect(hasRequiredRole(undefined, "STUDENT")).toBe(false);
  });

  describe("Authoritative Role-First Routing Decisions (determineUserRoleAndRouting)", () => {
    it("should route ADMIN user directly to /admin and NOT /onboarding", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: "ADMIN" } }),
            }),
          }),
        }),
      };

      const adminUser = { id: "admin-uuid-1", email: "admin@uohyd.ac.in" };
      const decision = await determineUserRoleAndRouting(adminUser, mockSupabase);

      expect(decision.isAdmin).toBe(true);
      expect(decision.role).toBe("ADMIN");
      expect(decision.targetUrl).toBe("/admin");
    });

    it("should route ADMIN user to /admin even if not yet in database (by ADMIN_EMAILS check)", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }), // Not in user_roles yet
            }),
          }),
        }),
      };

      const adminUser = { id: "admin-uuid-2", email: "superadmin@uohyd.ac.in" };
      const decision = await determineUserRoleAndRouting(adminUser, mockSupabase);

      expect(decision.isAdmin).toBe(true);
      expect(decision.role).toBe("ADMIN");
      expect(decision.targetUrl).toBe("/admin");
    });

    it("should route STUDENT with incomplete profile to /onboarding", async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === "user_roles") return { data: { role: "STUDENT" } };
                if (table === "students") return { data: { is_profile_completed: false } };
                return { data: null };
              },
            }),
          }),
        }),
      };

      const studentUser = { id: "student-uuid-1", email: "student.one@uohyd.ac.in" };
      const decision = await determineUserRoleAndRouting(studentUser, mockSupabase);

      expect(decision.isAdmin).toBe(false);
      expect(decision.role).toBe("STUDENT");
      expect(decision.isProfileCompleted).toBe(false);
      expect(decision.targetUrl).toBe("/onboarding");
    });

    it("should route STUDENT with completed profile directly to /dashboard", async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === "user_roles") return { data: { role: "STUDENT" } };
                if (table === "students") return { data: { is_profile_completed: true } };
                return { data: null };
              },
            }),
          }),
        }),
      };

      const studentUser = { id: "student-uuid-2", email: "student.two@uohyd.ac.in" };
      const decision = await determineUserRoleAndRouting(studentUser, mockSupabase);

      expect(decision.isAdmin).toBe(false);
      expect(decision.role).toBe("STUDENT");
      expect(decision.isProfileCompleted).toBe(true);
      expect(decision.targetUrl).toBe("/dashboard");
    });
  });
});
