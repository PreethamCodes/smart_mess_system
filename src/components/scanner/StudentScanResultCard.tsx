"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
  EligibilityResult,
  getAbsoluteSemester,
} from "@/types/database";
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
} from "lucide-react";

interface StudentScanResultCardProps {
  result: EligibilityResult | null;
  onNext: () => void;
  isFinalizing: boolean;
}

export default function StudentScanResultCard({
  result,
  onNext,
  isFinalizing,
}: StudentScanResultCardProps) {
  // Listen for Enter or Space keyboard shortcut to trigger NEXT for ultra-fast throughput
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        // Prevent default page scroll if space was pressed
        e.preventDefault();
        if (!isFinalizing && result) {
          onNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, isFinalizing, result]);

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

  return (
    <div
      className={`rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
        isEligible
          ? "bg-white border-emerald-300 shadow-emerald-500/10"
          : "bg-white border-rose-300 shadow-rose-500/10"
      }`}
    >
      {/* Top Eligibility Status Banner */}
      <div
        className={`px-6 py-4 flex items-center justify-between text-white ${
          isEligible
            ? "bg-gradient-to-r from-emerald-600 to-teal-600"
            : "bg-gradient-to-r from-rose-600 to-red-700"
        }`}
      >
        <div className="flex items-center gap-3">
          {isEligible ? (
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
              Verification Result
            </span>
            <div className="text-xl font-extrabold tracking-tight">
              {isEligible ? "✓ ELIGIBLE" : "✗ REJECTED"}
            </div>
          </div>
        </div>

        {!isEligible && rejectionReason && (
          <div className="px-3 py-1 bg-white/20 backdrop-blur rounded-lg text-xs font-bold text-white border border-white/30">
            {rejectionReason}
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
      </div>

      {/* Action Footer: NEXT Button */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>Keyboard shortcut:</span>
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded-md font-mono text-[11px] font-bold shadow-sm">
            Enter ↵
          </kbd>
          <span>or</span>
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded-md font-mono text-[11px] font-bold shadow-sm">
            Space ␣
          </kbd>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={isFinalizing}
          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
            isEligible
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
  );
}
