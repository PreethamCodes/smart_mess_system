"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MailCheck,
  KeyRound,
  ShieldAlert,
  Loader2,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }

    // Check if session is already active
    async function checkExistingSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setSuccessMsg("Email verified! Redirecting to onboarding...");
        setTimeout(() => {
          router.push("/onboarding");
          router.refresh();
        }, 800);
      }
    }
    checkExistingSession();
  }, [emailParam, router]);

  // Cooldown countdown timer for Resend OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanToken = token.trim().replace(/\s+/g, "");

    if (!email || !cleanToken) {
      setErrorMsg("Please enter both your university email and the 6-digit verification OTP.");
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Verify Numeric OTP with Supabase Auth
      let result = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanToken,
        type: "signup",
      });

      if (result.error) {
        // Fallback check with 'email' type
        result = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: cleanToken,
          type: "email",
        });
      }

      if (result.error) {
        throw new Error(
          result.error.message.includes("Token has expired")
            ? "Verification code has expired. Please click 'Resend OTP' to receive a new code."
            : result.error.message.includes("invalid") || result.error.message.includes("Token")
            ? "Invalid 6-digit OTP code entered. Please check your email and try again."
            : result.error.message
        );
      }

      setSuccessMsg("OTP verified successfully! Establishing session...");

      // Check user profile completion to route accurately
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: student } = await supabase
          .from("students")
          .select("is_profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        setTimeout(() => {
          if (student && student.is_profile_completed) {
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
          router.refresh();
        }, 800);
      } else {
        setTimeout(() => {
          router.push("/onboarding");
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("Please enter your university email to resend the code.");
      return;
    }

    if (cooldown > 0) return;

    try {
      setResending(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });

      if (error) {
        // Try fallback with email verification resend
        const retryRes = await supabase.auth.resend({
          type: "email_change",
          email: email.trim().toLowerCase(),
        });
        if (retryRes.error) {
          throw new Error(error.message);
        }
      }

      setSuccessMsg("A new 6-digit numeric verification OTP has been sent to your university email.");
      setCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend verification OTP.");
    } finally {
      setResending(false);
    }
  };

  const backUrl = email ? `/signup?email=${encodeURIComponent(email)}` : "/signup";

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl space-y-6">
        {/* Back Button */}
        <div>
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Registration</span>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify University Email</h2>
          <p className="text-xs text-gray-500">
            A numeric 6-digit OTP verification code has been dispatched to your @uohyd.ac.in inbox.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              University Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@uohyd.ac.in"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Numeric Verification OTP *
              </label>
              <span className="text-[11px] text-gray-500 font-mono">6 Digits</span>
            </div>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                placeholder="123456"
                maxLength={6}
                autoFocus
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-2xl font-mono font-bold tracking-[0.3em] text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Enter the 6-digit OTP code received in your university email.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying OTP code...
              </>
            ) : (
              <>
                Verify & Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Didn&apos;t receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="text-blue-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-gray-500">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
