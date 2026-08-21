import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Smart Mess Management & Automation System - University of Hyderabad",
  description:
    "Official multi-mess digital identity and automation platform for the University of Hyderabad.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userEmail: string | null = null;
  let userRole: "STUDENT" | "ADMIN" | null = null;
  let isProfileCompleted = false;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email || null;

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      userRole = (roleData?.role as "STUDENT" | "ADMIN") || "STUDENT";

      // Fetch student profile status
      if (userRole === "STUDENT") {
        const { data: student } = await supabase
          .from("students")
          .select("is_profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        isProfileCompleted = student?.is_profile_completed || false;
      }
    }
  } catch (err) {
    // If Supabase is not yet initialized or offline during build
  }

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <Navbar
          userEmail={userEmail}
          role={userRole}
          isProfileCompleted={isProfileCompleted}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
