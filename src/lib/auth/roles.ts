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

/**
 * Server-side authoritative determination of user role and target routing path.
 * 
 * Critical rule: ADMIN role check occurs BEFORE any student profile check.
 * Admins NEVER get checked for student profile or redirected to /onboarding.
 */
export async function determineUserRoleAndRouting(
  user: { id: string; email?: string | null },
  supabase: any,
  adminDb?: any
): Promise<{
  role: UserRoleType;
  targetUrl: "/admin" | "/dashboard" | "/onboarding";
  isAdmin: boolean;
  isProfileCompleted: boolean;
}> {
  const email = user.email?.toLowerCase();
  const isAdminByEmail = isPreconfiguredAdminEmail(email);

  // 1. Check user_roles table for ADMIN
  let hasAdminRoleInDb = false;
  try {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "ADMIN") {
      hasAdminRoleInDb = true;
    }
  } catch {
    // Continue
  }

  // 2. If ADMIN by email or DB role
  if (isAdminByEmail || hasAdminRoleInDb) {
    // If admin by email but not yet in user_roles, self-heal / bootstrap in background
    if (isAdminByEmail && !hasAdminRoleInDb && adminDb) {
      try {
        await adminDb.from("user_roles").upsert(
          {
            user_id: user.id,
            role: "ADMIN",
          },
          { onConflict: "user_id,role" }
        );
      } catch {
        // Continue
      }
    }

    return {
      role: "ADMIN",
      targetUrl: "/admin",
      isAdmin: true,
      isProfileCompleted: false, // Inapplicable for admins
    };
  }

  // 3. STUDENT Role: Check profile completion status
  let isProfileCompleted = false;
  try {
    const { data: student } = await supabase
      .from("students")
      .select("is_profile_completed")
      .eq("id", user.id)
      .maybeSingle();

    isProfileCompleted = student?.is_profile_completed ?? false;
  } catch {
    isProfileCompleted = false;
  }

  return {
    role: "STUDENT",
    targetUrl: isProfileCompleted ? "/dashboard" : "/onboarding",
    isAdmin: false,
    isProfileCompleted,
  };
}
