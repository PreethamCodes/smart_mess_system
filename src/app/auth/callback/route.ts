import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const supabase = createClient();

  // Helper to determine destination for verified user
  async function getDestinationForUser(user: { id: string; email?: string | null }): Promise<string> {
    const email = user.email?.toLowerCase();
    let isAdmin = isPreconfiguredAdminEmail(email);

    if (!isAdmin) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role === "ADMIN") {
        isAdmin = true;
      }
    }

    if (isAdmin) {
      return `${origin}/admin`;
    }

    const { data: student } = await supabase
      .from("students")
      .select("is_profile_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (student && student.is_profile_completed) {
      return `${origin}/dashboard`;
    }

    return `${origin}/onboarding`;
  }

  // Handle PKCE Code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const destination = await getDestinationForUser(user);
        return NextResponse.redirect(destination);
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Handle Token Hash confirmation link (fallback for older/implicit-style confirmation links)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const destination = await getDestinationForUser(user);
        return NextResponse.redirect(destination);
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // If callback failed or link expired, return to login with informative query parameter
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Email confirmation link expired or invalid. Please sign in, or request a new confirmation email from the signup page."
    )}`
  );
}
