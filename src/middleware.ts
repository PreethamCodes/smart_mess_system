import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  // If Supabase keys are not set yet, allow page to render setup hints
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/auth");
  const isPublicRoute =
    isAuthRoute ||
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/messes") ||
    pathname.startsWith("/api/hostels");

  // 1. If NOT authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. If AUTHENTICATED
  if (user) {
    // -------------------------------------------------------------------------
    // CRITICAL: Determine role BEFORE any onboarding check.
    // Admins NEVER get checked for student profile or redirected to /onboarding.
    // -------------------------------------------------------------------------
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

    // A. ADMIN USER ROUTING
    if (isAdmin) {
      // If admin visits auth routes (/login, /signup, /verify-email), root (/), or student routes (/onboarding, /dashboard)
      if (
        (isAuthRoute && !pathname.startsWith("/auth")) ||
        pathname === "/" ||
        pathname === "/onboarding" ||
        pathname.startsWith("/dashboard")
      ) {
        const adminUrl = request.nextUrl.clone();
        adminUrl.pathname = "/admin";
        return NextResponse.redirect(adminUrl);
      }
      // Allow access to /admin and admin APIs
      return response;
    }

    // B. STUDENT USER ROUTING
    // Protect /admin route: Non-admins cannot access /admin
    if (pathname.startsWith("/admin")) {
      const deniedUrl = request.nextUrl.clone();
      deniedUrl.pathname = "/dashboard";
      return NextResponse.redirect(deniedUrl);
    }

    // If student visits auth routes (/login, /signup, /verify-email) while authenticated
    if (isAuthRoute && !pathname.startsWith("/auth")) {
      const { data: student } = await supabase
        .from("students")
        .select("is_profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = student?.is_profile_completed ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(targetUrl);
    }

    // If student visits /dashboard or / without completing onboarding
    if (pathname.startsWith("/dashboard") || pathname === "/") {
      const { data: student } = await supabase
        .from("students")
        .select("is_profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!student || !student.is_profile_completed) {
        const onboardingUrl = request.nextUrl.clone();
        onboardingUrl.pathname = "/onboarding";
        return NextResponse.redirect(onboardingUrl);
      }
    }

    // If student has already completed onboarding, prevent accessing /onboarding again
    if (pathname === "/onboarding") {
      const { data: student } = await supabase
        .from("students")
        .select("is_profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (student && student.is_profile_completed) {
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = "/dashboard";
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
