import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    pathname.startsWith("/api/messes");

  // If NOT authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If AUTHENTICATED
  if (user) {
    // Check user roles
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = roleData?.role === "ADMIN";

    // If navigating to login/signup while already authenticated (except callback)
    if (isAuthRoute && !pathname.startsWith("/auth")) {
      const targetUrl = request.nextUrl.clone();
      targetUrl.pathname = isAdmin ? "/admin" : "/dashboard";
      return NextResponse.redirect(targetUrl);
    }

    // Protect /admin route: Only ADMIN role allowed
    if (pathname.startsWith("/admin")) {
      if (!isAdmin) {
        const deniedUrl = request.nextUrl.clone();
        deniedUrl.pathname = "/dashboard";
        return NextResponse.redirect(deniedUrl);
      }
    }

    // For non-admin students, enforce mandatory onboarding completion
    if (!isAdmin && (pathname.startsWith("/dashboard") || pathname === "/")) {
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

    // If student has already completed onboarding, prevent navigating back to /onboarding
    if (!isAdmin && pathname === "/onboarding") {
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
