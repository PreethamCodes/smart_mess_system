import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isPreconfiguredAdminEmail, hasRequiredRole } from "../src/lib/auth/roles";

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
});
