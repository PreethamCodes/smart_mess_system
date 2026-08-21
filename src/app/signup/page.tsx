"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema, isValidUniversityEmail } from "@/lib/validations/auth";
import { UtensilsCrossed, Mail, Lock, ShieldAlert, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validate University Email Domain
    if (!isValidUniversityEmail(email)) {
      setErrorMsg("Registration is restricted exclusively to University of Hyderabad accounts (@uohyd.ac.in).");
      return;
    }

    // 2. Validate Schema
    const validation = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.errors[0]?.message || "Validation failed");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/onboarding`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // If user session is returned immediately (e.g. email auto-confirmed in local dev), redirect to onboarding
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        // Redirect to the email confirmation screen with email pre-populated
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create university account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Student Mess Registration</h2>
          <p className="text-sm text-gray-600">
            Create your University of Hyderabad student account
          </p>
        </div>

        {/* University Domain Notice Banner */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Use your @uohyd.ac.in university email.</span>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              University Email (@uohyd.ac.in) *
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student.id@uohyd.ac.in"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Create Password (min. 8 characters) *
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending confirmation email...
              </>
            ) : (
              <>
                Continue with Registration
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100 text-xs text-gray-600">
          Already registered?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:underline">
            Sign In with Password
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Loading registration...</div>}>
      <SignupContent />
    </Suspense>
  );
}
