import { UserRoleType } from "@/types/database";

/**
 * Checks if a given email is listed in the server-side ADMIN_EMAILS environment variable.
 * Note: This check only runs on the server.
 */
export function isPreconfiguredAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  const adminList = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  return adminList.includes(email.trim().toLowerCase());
}

export const isEmailConfiguredAsAdmin = isPreconfiguredAdminEmail;

/**
 * Authorization helper: Verifies if a user role matches the required role.
 */
export function hasRequiredRole(userRole: UserRoleType | null | undefined, requiredRole: UserRoleType): boolean {
  if (!userRole) return false;
  if (userRole === "ADMIN") return true; // ADMIN has access to all current Phase 1 capabilities
  return userRole === requiredRole;
}
