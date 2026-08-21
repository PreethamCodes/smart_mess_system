"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  EligibilityResult,
  getAbsoluteSemester,
  RejectionReasonCode,
} from "@/types/database";
import { REJECTION_MESSAGES } from "@/lib/meals/config";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  ShieldAlert,
  User,
  UtensilsCrossed,
  Home,
  CreditCard,
  Ban,
  RotateCcw,
} from "lucide-react";

interface StudentScanResultCardProps {
  result: EligibilityResult | null;
  onNext: (overrideStatus?: "APPROVED" | "REJECTED", overrideReason?: string) => void;
  isFinalizing: boolean;
}

export default function StudentScanResultCard({
  result,
  onNext,
  isFinalizing,
}: StudentScanResultCardProps) {
  // Manual Rejection State
  const [isManualRejectMode, setIsManualRejectMode] = useState<boolean>(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>(
    REJECTION_MESSAGES.STUDENT_MISMATCH
  );

  // Reset manual rejection mode when result changes
  useEffect(() => {
    setIsManualRejectMode(false);
    setSelectedRejectionReason(REJECTION_MESSAGES.STUDENT_MISMATCH);
  }, [result?.scannedToken, result?.student?.id]);

  // Listen for Enter or Space keyboard shortcut to trigger NEXT for ultra-fast throughput
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        // Only trigger if not focused in an input/select
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

        e.preventDefault();
        if (!isFinalizing && result) {
          if (isManualRejectMode) {
            onNext("REJECTED", selectedRejectionReason);
          } else {
            onNext();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, isFinalizing, result, isManualRejectMode, selectedRejectionReason]);

  if (!result) {
    return (
      <div className="h-full min-h-[380px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 text-gray-400">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
          <UtensilsCrossed className="w-8 h-8 text-gray-300" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-gray-700 text-base">Waiting for Student QR</h3>
          <p className="text-xs text-gray-500 max-w-xs">
            Hold student card in front of the camera. The result and identity will display automatically.
          </p>
        </div>
      </div>
    );
  }

  const { isEligible, rejectionReason, student } = result;
  const isDisplayingEligible = isEligible && !isManualRejectMode;

  const handleNextClick = () => {
    if (isManualRejectMode) {
      onNext("REJECTED", selectedRejectionReason);
    } else {
      onNext();
    }
  };

  return (
    <div
      className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
        isDisplayingEligible
          ? "bg-white border-emerald-300 shadow-emerald-500/10"
          : "bg-white border-rose-300 shadow-rose-500/10"
      }`}
    >
      {/* Top Eligibility Status Banner */}
      <div
        className={`px-6 py-4 flex items-center justify-between text-white ${
          isDisplayingEligible
            ? "bg-gradient-to-r from-emerald-600 to-teal-600"
            : "bg-gradient-to-r from-rose-600 to-red-700"
        }`}
      >
        <div className="flex items-center gap-3">
          {isDisplayingEligible ? (
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <XCircle className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
              {isManualRejectMode ? "Operator Manual Override" : "Verification Result"}
            </span>
            <div className="text-xl font-extrabold tracking-tight">
              {isDisplayingEligible ? "✓ ELIGIBLE" : "✗ REJECTED"}
            </div>
          </div>
        </div>

        {!isDisplayingEligible && (
          <div className="px-3 py-1 bg-white/20 backdrop-blur rounded-lg text-xs font-bold text-white border border-white/30">
            {isManualRejectMode ? selectedRejectionReason : rejectionReason}
          </div>
        )}
      </div>

      {/* Main Student Details Content */}
      <div className="p-6 space-y-6 flex-1">
        {student ? (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Student Photo */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-md relative">
                {student.photo_url ? (
                  <Image
                    src={student.photo_url}
                    alt={student.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <User className="w-12 h-12 text-gray-300" />
                    <span className="text-[10px] text-gray-400 font-medium mt-1">No Photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Student Info Details */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {student.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-gray-100 border border-gray-300 font-mono text-xs font-bold text-gray-800">
                    {student.student_id}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {student.course} • Sem {getAbsoluteSemester(student.year, student.semester)}
                  </span>
                  {result.verificationMethod === "MANUAL" && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold tracking-wider uppercase border border-purple-200">
                      Manual Entry
                    </span>
                  )}
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Hostel</span>
                    <span className="font-semibold text-gray-800">{student.hostel}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Mess</span>
                    <span className="font-semibold text-blue-900">{student.assigned_mess_name}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Card Status</span>
                    <span
                      className={`font-semibold ${
                        student.card_status === "ACTIVE"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {student.card_status}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Leave State</span>
                    <span
                      className={`font-semibold ${
                        student.is_on_leave ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {student.is_on_leave ? "On Leave" : "Present"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Invalid Card or Unknown QR state */
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="font-bold text-rose-900 text-base">Unrecognized Credential Token</h3>
            <p className="text-xs text-rose-700 font-mono break-all max-w-sm mx-auto">
              Token: {result.scannedToken}
            </p>
            <p className="text-xs text-gray-500 pt-1">
              This card does not correspond to an active university mess identity.
            </p>
          </div>
        )}

        {/* Manual Rejection Selection Panel (V1.3 Feature 3) */}
        {isManualRejectMode && (
          <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in duration-200">
            <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider">
              Select Manual Rejection Reason *
            </label>
            <select
              value={selectedRejectionReason}
              onChange={(e) => setSelectedRejectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
            >
              {Object.entries(REJECTION_MESSAGES).map(([code, message]) => (
                <option key={code} value={message}>
                  {message}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-rose-700">
              Pressing NEXT will record this student as REJECTED with the selected reason and resume the scanner.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer: NEXT and REJECT Buttons */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>Keyboard:</span>
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded-md font-mono text-[11px] font-bold shadow-sm">
            Enter ↵
          </kbd>
          <span>or</span>
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded-md font-mono text-[11px] font-bold shadow-sm">
            Space ␣
          </kbd>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Manual Rejection Trigger Buttons */}
          {isEligible && !isManualRejectMode && (
            <button
              type="button"
              onClick={() => setIsManualRejectMode(true)}
              disabled={isFinalizing}
              className="w-full sm:w-auto px-5 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 transition-all flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>REJECT</span>
            </button>
          )}

          {isManualRejectMode && (
            <button
              type="button"
              onClick={() => setIsManualRejectMode(false)}
              disabled={isFinalizing}
              className="w-full sm:w-auto px-4 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CANCEL REJECT</span>
            </button>
          )}

          {/* Primary NEXT / FINALIZE Button */}
          <button
            type="button"
            onClick={handleNextClick}
            disabled={isFinalizing}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
              isDisplayingEligible
                ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/25"
                : "bg-gray-900 hover:bg-gray-800 active:bg-black text-white shadow-gray-900/20"
            }`}
          >
            {isFinalizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <span>NEXT STUDENT</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
