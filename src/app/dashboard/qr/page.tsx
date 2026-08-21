"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCard } from "@/components/QRCard";
import { PrintCard } from "@/components/PrintCard";
import { Student, MessCredential } from "@/types/database";
import { QrCode, Printer, ShieldAlert, Loader2, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudentQRPage() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [credential, setCredential] = useState<MessCredential | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load student profile & existing credential
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch student
        const profileRes = await fetch("/api/student/profile");
        const profileData = await profileRes.json();

        if (!profileRes.ok || !profileData.student) {
          router.push("/onboarding");
          return;
        }

        setStudent(profileData.student);

        // 2. Fetch credential
        const credRes = await fetch("/api/credentials/generate");
        const credData = await credRes.json();

        if (credData.hasCredential && credData.credential) {
          setCredential(credData.credential);
        }
      } catch (err: any) {
        console.error("Error loading QR page data:", err);
        setErrorMsg("Failed to load student mess credential data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Handle explicit "GENERATE QR" action
  const handleGenerateQR = async () => {
    try {
      setGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/credentials/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate QR credential.");
      }

      setCredential(data.credential);
      setSuccessMsg(
        data.isNew
          ? "Unique QR credential generated successfully!"
          : "Active QR credential retrieved."
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate QR card.");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-600">
          Loading student mess credential...
        </p>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-8 space-y-6">
      {/* Back to Dashboard Link */}
      <div className="print:hidden">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Dashboard
        </Link>
      </div>

      {/* Page Header */}
      <div className="text-center space-y-1 print:hidden">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Student Mess QR Card
        </h1>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Your official digital credential for university mess meal entry and identification.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm print:hidden">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Explicit GENERATE QR Action (When not generated yet) */}
      {!credential && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-md text-center space-y-5 print:hidden">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900">Generate Your Mess QR</h2>
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              Your mandatory profile is complete! Click the button below to issue your unique, opaque QR mess credential for {student.mess?.name || "your assigned mess"}.
            </p>
          </div>

          <button
            onClick={handleGenerateQR}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Unique Credential...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                GENERATE QR
              </>
            )}
          </button>
        </div>
      )}

      {/* Display Soft-Copy QR Card */}
      <div className="print:hidden">
        <QRCard
          student={student}
          credential={credential}
          onPrint={credential ? handlePrint : undefined}
        />
      </div>

      {/* Print-specific layout component (Only visible in window.print()) */}
      {credential && <PrintCard student={student} credential={credential} />}
    </div>
  );
}
