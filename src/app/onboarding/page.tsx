import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { UserCheck, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

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
          Please fill in your mandatory university identity details and photo below. Your dining facility is automatically assigned based on your hostel allocation.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Identity & Mess Protection Notice:</span> Your Student ID uniquely identifies you. Your mess assignment is automatically linked to your hostel and registered upon profile submission.
        </div>
      </div>

      <ProfileForm initialStudent={student} />
    </div>
  );
}
