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

    // Check if an authenticated session already exists
    async function checkExistingSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        try {
          const res = await fetch("/api/auth/post-login", { method: "POST" });
          const data = await res.json();
          if (data.success && data.targetUrl) {
            router.push(data.targetUrl);
            router.refresh();
            return;
          }
        } catch {
          // Fallback
        }
        router.push("/onboarding");
        router.refresh();
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
      setErrorMsg("Please enter your university email and the verification OTP code.");
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
            ? "Verification code has expired. Please click 'RESEND CODE' to receive a new code."
            : result.error.message.includes("invalid") || result.error.message.includes("Token")
            ? "Invalid verification OTP code. Please check your university inbox and try again."
            : result.error.message
        );
      }

      setSuccessMsg("OTP verified successfully! Establishing session...");

      // Authoritative server-side role and routing resolution
      try {
        const postLoginRes = await fetch("/api/auth/post-login", {
          method: "POST",
        });
        const postLoginData = await postLoginRes.json();

        if (postLoginData.success && postLoginData.targetUrl) {
          setTimeout(() => {
            router.push(postLoginData.targetUrl);
            router.refresh();
          }, 600);
          return;
        }
      } catch (postLoginErr) {
        console.error("Post-verification routing error:", postLoginErr);
      }

      setTimeout(() => {
        router.push("/onboarding");
        router.refresh();
      }, 600);
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
        const retryRes = await supabase.auth.resend({
          type: "email_change",
          email: email.trim().toLowerCase(),
        });
        if (retryRes.error) {
          throw new Error(error.message);
        }
      }

      setSuccessMsg("A new verification code has been sent to your university email.");
      setCooldown(60); // 60 seconds cooldown to respect rate limits
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend verification code.");
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
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK</span>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Email Address</h2>
          <p className="text-xs text-gray-600">
            We sent a verification code to your university email.
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
              Email
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
                Verification Code *
              </label>
              <span className="text-[11px] text-gray-500 font-mono">Numeric OTP</span>
            </div>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                autoFocus
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 text-2xl font-mono font-bold tracking-[0.3em] text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Enter the OTP code received in your @uohyd.ac.in university email.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Code...
              </>
            ) : (
              <>
                VERIFY EMAIL
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
            className="text-blue-600 font-bold uppercase tracking-wider hover:underline flex items-center gap-1 disabled:opacity-50 disabled:no-underline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `RESEND (${cooldown}s)`
              : "RESEND CODE"}
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
