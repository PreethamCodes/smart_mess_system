"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  MealType,
  EligibilityResult,
  StudentVerificationDetails,
  getAbsoluteSemester,
} from "@/types/database";
import {
  Search,
  X,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  UtensilsCrossed,
  Home,
  CreditCard,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface ManualStudentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  messId: string;
  messName: string;
  mealType: MealType;
  onApproveManual: (student: StudentVerificationDetails, mealDate: string) => Promise<void>;
}

export default function ManualStudentVerificationModal({
  isOpen,
  onClose,
  messId,
  messName,
  mealType,
  onApproveManual,
}: ManualStudentVerificationModalProps) {
  const [studentIdInput, setStudentIdInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<EligibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    setSearchResult(null);

    try {
      const res = await fetch("/api/scanner/manual-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id_input: studentIdInput.trim(),
          mess_id: messId,
          meal_type: mealType,
        }),
      });

      const data: EligibilityResult = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || "Failed to search student record.");
      }

      setSearchResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to find student record.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleApprove = async () => {
    if (!searchResult?.student || !searchResult.isEligible) return;

    setIsApproving(true);
    try {
      await onApproveManual(searchResult.student, searchResult.mealDate);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record manual meal approval.");
    } finally {
      setIsApproving(false);
    }
  };

  const student = searchResult?.student;
  const isEligible = searchResult?.isEligible;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Manual Student Verification</h2>
              <p className="text-[11px] text-gray-300">
                Fallback verification for {messName} • {mealType}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                placeholder="Enter Canonical Student ID (e.g. 21MCMS01)"
                autoFocus
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-gray-300 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !studentIdInput.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEARCH"}
            </button>
          </form>

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Search Results Display */}
          {searchResult && (
            <div
              className={`rounded-2xl border p-5 space-y-4 ${
                isEligible
                  ? "bg-emerald-50/50 border-emerald-300"
                  : "bg-rose-50/50 border-rose-300"
              }`}
            >
              {/* Verdict Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                <div className="flex items-center gap-2">
                  {isEligible ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span
                    className={`font-extrabold text-sm uppercase tracking-wider ${
                      isEligible ? "text-emerald-800" : "text-rose-800"
                    }`}
                  >
                    {isEligible ? "✓ Eligible for Meal" : "✗ Rejected"}
                  </span>
                </div>

                {!isEligible && searchResult.rejectionReason && (
                  <span className="text-xs font-bold text-rose-700 bg-white px-2.5 py-1 rounded-md border border-rose-200">
                    {searchResult.rejectionReason}
                  </span>
                )}
              </div>

              {/* Student Info */}
              {student ? (
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative flex-shrink-0">
                    {student.photo_url ? (
                      <Image
                        src={student.photo_url}
                        alt={student.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-xs font-bold text-gray-800">
                          {student.student_id}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {student.course} • Sem {getAbsoluteSemester(student.year, student.semester)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-gray-400" />
                        <span>Hostel: <strong className="text-gray-800">{student.hostel}</strong></span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-blue-500" />
                        <span>Mess: <strong className="text-blue-900">{student.assigned_mess_name}</strong></span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        <span>Card: <strong className={student.card_status === "ACTIVE" ? "text-emerald-700" : "text-rose-700"}>{student.card_status}</strong></span>
                      </div>
                      <div className="p-2 rounded-xl bg-white border border-gray-200 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>Leave: <strong className={student.is_on_leave ? "text-amber-700" : "text-emerald-700"}>{student.is_on_leave ? "On Leave" : "Present"}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">
                  No university student record matches the entered Student ID.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 text-xs font-bold uppercase tracking-wider transition-all"
          >
            CANCEL
          </button>

          {isEligible && student && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Approval...</span>
                </>
              ) : (
                <>
                  <span>APPROVE MEAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
