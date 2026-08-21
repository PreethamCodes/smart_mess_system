import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UtensilsCrossed, QrCode, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function HomePage() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role === "ADMIN") {
        redirect("/admin");
      }

      const { data: student } = await supabase
        .from("students")
        .select("is_profile_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!student || !student.is_profile_completed) {
        redirect("/onboarding");
      } else {
        redirect("/dashboard");
      }
    }
  } catch (err) {
    // If Supabase is unconfigured, show public landing page
  }

  return (
    <div className="py-12 md:py-20">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <UtensilsCrossed className="w-4 h-4 text-blue-600" />
          <span>University of Hyderabad • Smart Mess Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Smart Mess Management & Automation System
        </h1>

        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Multi-mess university automation platform providing secure identity verification, opaque QR credentials, and seamless meal management across all 10 university messes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all"
          >
            Sign In with University ID
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-semibold text-base rounded-xl transition-all"
          >
            New Student Registration
          </Link>
        </div>

        <p className="text-xs text-gray-500 font-mono">
          Only official university email accounts (@uohyd.ac.in) are permitted to register.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Verified University Auth</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Strict @uohyd.ac.in domain verification with OTP authentication, secure passwords, and persistent sessions.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Opaque QR Credentials</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Generates unique, cryptographically random QR cards with zero personally identifiable information (PII) leakage.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">10 University Messes</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Unified foundation supporting Mess 1 through Mess 10 with protected student-to-mess assignment architecture.
          </p>
        </div>
      </div>
    </div>
  );
}
