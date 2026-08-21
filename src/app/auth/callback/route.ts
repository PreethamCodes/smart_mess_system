import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const supabase = createClient();

  // Handle PKCE Code exchange (e.g. from confirmation links)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.role === "ADMIN") {
          return NextResponse.redirect(`${origin}/admin`);
        }

        // Check student onboarding profile status
        const { data: student } = await supabase
          .from("students")
          .select("is_profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (student && student.is_profile_completed) {
          return NextResponse.redirect(`${origin}/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Handle Token Hash OTP (e.g. magiclink / signup token verification)
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
        const { data: student } = await supabase
          .from("students")
          .select("is_profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (student && student.is_profile_completed) {
          return NextResponse.redirect(`${origin}/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // If callback failed or link expired, return to login with informative query parameter
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Email verification link expired or invalid. Please sign in or request a new code."
    )}`
  );
}
