"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MailCheck,
  Mail,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

/**
 * Resolves a webmail URL for well-known consumer email providers based on the
 * email's domain. University addresses (@uohyd.ac.in) are not a known
 * webmail provider, so this intentionally falls through to a generic
 * "mailto:" open in that case (and for any other unrecognized domain) rather
 * than guessing at a URL. This never verifies anything by itself -- it only
 * helps the student get to their inbox faster.
 */
function getEmailProviderUrl(email: string): string {
  const domain = (email.split("@")[1] || "").toLowerCase();

  if (domain.includes("gmail.com")) {
    return "https://mail.google.com/mail/u/0/#search/from%3Anoreply";
  }
  if (
    domain.includes("outlook.com") ||
    domain.includes("hotmail.com") ||
    domain.includes("live.com") ||
    domain.includes("msn.com")
  ) {
    return "https://outlook.live.com/mail/0/inbox";
  }
  if (domain.includes("yahoo.com")) {
    return "https://mail.yahoo.com/";
  }

  // Generic fallback: open the OS/browser's default mail handler.
  return "mailto:";
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // -------------------------------------------------------------------------
  // Session detection: the actual verification always happens through
  // Supabase Auth via the confirmation link -> /auth/callback. This screen
  // never marks the email as verified itself -- it only watches for the
  // authenticated session that Supabase creates once the link is confirmed,
  // so a student who clicked the link in another tab (or came back to this
  // one) is carried forward automatically.
  // -------------------------------------------------------------------------
  const checkExistingSession = useCallback(async () => {
    setCheckingSession(true);
    try {
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
          // Fallback below
        }
        router.push("/onboarding");
        router.refresh();
      }
    } finally {
      setCheckingSession(false);
    }
  }, [router]);

  useEffect(() => {
    checkExistingSession();

    // Re-check whenever the student comes back to this tab -- covers the
    // "clicked the confirmation link in a new tab" case.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExistingSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [checkExistingSession]);

  // Cooldown countdown timer for Resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("Please go back and enter your university email first.");
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
        throw new Error(error.message);
      }

      setSuccessMsg("A new confirmation email has been sent.");
      setCooldown(60); // 60 seconds cooldown to respect rate limits
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend the confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handleOpenEmail = () => {
    if (!email) return;
    const url = getEmailProviderUrl(email);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleChangeEmail = () => {
    router.push(email ? `/signup?email=${encodeURIComponent(email)}` : "/signup");
  };

  return (
    <div className="max-w-md mx-auto py-8 sm:py-12">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-600">
            We&apos;ve sent a confirmation link to
          </p>
          <p className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg inline-block break-all">
            {email || "your university email"}
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

        <p className="text-xs text-gray-600 text-center leading-relaxed">
          Open your email and click <span className="font-semibold text-gray-900">&quot;Confirm email address&quot;</span> to
          verify your account. This page will automatically continue once your
          email is confirmed.
        </p>

        <button
          type="button"
          onClick={handleOpenEmail}
          disabled={!email}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          Open Email
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {checkingSession && (
          <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking confirmation status...
          </p>
        )}

        <div className="pt-3 border-t border-gray-100 space-y-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <span>Didn&apos;t receive the email?</span>
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
                ? `Resend (${cooldown}s)`
                : "Resend confirmation"}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={handleChangeEmail}
              className="text-xs text-gray-500 hover:text-blue-600 font-medium hover:underline transition-colors"
            >
              Wrong email? <span className="font-bold">Change email</span>
            </button>
          </div>
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
