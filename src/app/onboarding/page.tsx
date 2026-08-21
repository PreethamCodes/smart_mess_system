import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "@/components/ProfileForm";
import { Mess } from "@/types/database";
import { UserCheck, ShieldCheck } from "lucide-react";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if student profile is already completed
  const { data: student } = await supabase
    .from("students")
    .select("*, mess:messes(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (student && student.is_profile_completed) {
    redirect("/dashboard");
  }

  // Fetch active messes on server
  let messes: Mess[] = [];
  try {
    const { data: messesData } = await supabase
      .from("messes")
      .select("id, name, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (messesData && messesData.length > 0) {
      messes = messesData as Mess[];
    } else {
      const adminDb = createAdminClient();
      const { data: adminMesses } = await adminDb
        .from("messes")
        .select("id, name, is_active, created_at, updated_at")
        .eq("is_active", true)
        .order("name", { ascending: true });
      messes = (adminMesses as Mess[]) || [];
    }
  } catch (err) {
    console.error("Error loading messes on onboarding server:", err);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10">
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>First Login Required Step</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Complete Student Profile
        </h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto">
          Please fill in your mandatory university identity details and photo below. Once saved, you will be able to generate your official opaque QR mess credential.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Identity Protection Notice:</span> Your Student ID uniquely identifies you across all university messes. Your assigned mess will be registered upon submission and cannot be freely altered.
        </div>
      </div>

      <ProfileForm initialStudent={student} initialMesses={messes} />
    </div>
  );
}
