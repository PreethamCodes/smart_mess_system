"use client";

import React, { useState, useCallback } from "react";
import {
  MealType,
  ScannerState,
  EligibilityResult,
} from "@/types/database";
import { getMealDisplayName, getMealTimeWindow } from "@/lib/meals/config";
import QRScannerEngine from "./QRScannerEngine";
import StudentScanResultCard from "./StudentScanResultCard";
import {
  UtensilsCrossed,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  LogOut,
  Clock,
  Sparkles,
} from "lucide-react";

interface ContinuousMealScannerProps {
  messId: string;
  messName: string;
  mealType: MealType;
  onEndSession: () => void;
}

interface ScanLogItem {
  id: string;
  time: string;
  name: string;
  studentId: string;
  status: "APPROVED" | "REJECTED";
  reason?: string | null;
}

export default function ContinuousMealScanner({
  messId,
  messName,
  mealType,
  onEndSession,
}: ContinuousMealScannerProps) {
  const [scannerState, setScannerState] = useState<ScannerState>("SCANNING");
  const [currentResult, setCurrentResult] = useState<EligibilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Session KPIs
  const [sessionStats, setSessionStats] = useState({
    totalScanned: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });

  // Recent Scan Activity Log
  const [recentLogs, setRecentLogs] = useState<ScanLogItem[]>([]);

  // ---------------------------------------------------------------------------
  // 1. QR Code Detected Handler
  // ---------------------------------------------------------------------------
  const handleScan = useCallback(
    async (rawToken: string) => {
      // Guard: Only process when scanner is actively in SCANNING state
      if (scannerState !== "SCANNING") {
        return;
      }

      setScannerState("PROCESSING");
      setErrorMessage(null);

      try {
        const response = await fetch("/api/scanner/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_token: rawToken,
            mess_id: messId,
            meal_type: mealType,
          }),
        });

        const data: EligibilityResult = await response.json();

        if (!response.ok) {
          throw new Error((data as any).error || "Failed to verify credential.");
        }

        setCurrentResult(data);
        setScannerState(data.status); // 'ELIGIBLE' or 'REJECTED'
      } catch (err: any) {
        console.error("Meal verification error:", err);
        setErrorMessage(err.message || "Network error while verifying QR code.");
        // Fallback rejection result
        setCurrentResult({
          isEligible: false,
          status: "REJECTED",
          rejectionReason: err.message || "Network error",
          rejectionCode: "OTHER",
          student: null,
          scannedToken: rawToken,
          sessionMessId: messId,
          mealType,
          mealDate: new Date().toISOString().split("T")[0],
        });
        setScannerState("REJECTED");
      }
    },
    [scannerState, messId, mealType]
  );

  // ---------------------------------------------------------------------------
  // 2. NEXT Button Handler: Finalize Transaction & Automatically Resume Scanner
  // ---------------------------------------------------------------------------
  const handleNext = useCallback(async () => {
    if (!currentResult || scannerState === "FINALIZING") {
      return;
    }

    setScannerState("FINALIZING");
    setErrorMessage(null);

    const isApproved = currentResult.isEligible;
    const studentId = currentResult.student?.id;

    try {
      if (studentId) {
        // Record finalized transaction to backend database
        await fetch("/api/scanner/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            mess_id: messId,
            meal_type: mealType,
            status: isApproved ? "APPROVED" : "REJECTED",
            rejection_reason: currentResult.rejectionReason,
            meal_date: currentResult.mealDate,
          }),
        });
      }

      // Update Live Session KPIs
      setSessionStats((prev) => ({
        totalScanned: prev.totalScanned + 1,
        approvedCount: prev.approvedCount + (isApproved ? 1 : 0),
        rejectedCount: prev.rejectedCount + (!isApproved ? 1 : 0),
      }));

      // Add to recent activity audit trail
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const logEntry: ScanLogItem = {
        id: `${Date.now()}-${Math.random()}`,
        time: timeStr,
        name: currentResult.student?.name || "Unrecognized Student",
        studentId: currentResult.student?.student_id || "N/A",
        status: isApproved ? "APPROVED" : "REJECTED",
        reason: currentResult.rejectionReason,
      };

      setRecentLogs((prev) => [logEntry, ...prev.slice(0, 7)]); // Keep last 8 entries
    } catch (err: any) {
      console.error("Finalization error:", err);
    } finally {
      // -----------------------------------------------------------------------
      // CRITICAL: Reset current student state and AUTOMATICALLY resume scanning
      // -----------------------------------------------------------------------
      setCurrentResult(null);
      setScannerState("SCANNING");
    }
  }, [currentResult, scannerState, messId, mealType]);

  const isScannerPaused = scannerState !== "SCANNING";

  return (
    <div className="space-y-6">
      {/* Session Active Top Navigation Bar */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                MEAL APPROVAL ACTIVE
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {getMealTimeWindow(mealType)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{messName}</span>
              <span className="text-gray-500 font-light">•</span>
              <span className="text-blue-400">{getMealDisplayName(mealType)}</span>
            </h1>
          </div>

          {/* Session KPIs + End Session Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-2 text-center border border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Approved</span>
              <span className="text-xl font-extrabold text-emerald-400">{sessionStats.approvedCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl px-4 py-2 text-center border border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Rejected</span>
              <span className="text-xl font-extrabold text-rose-400">{sessionStats.rejectedCount}</span>
            </div>
            <button
              type="button"
              onClick={onEndSession}
              className="px-4 py-3 bg-white/10 hover:bg-rose-600 active:bg-rose-700 text-white rounded-2xl text-xs font-bold tracking-wider uppercase border border-white/20 transition-all flex items-center gap-2 ml-auto sm:ml-0"
            >
              <LogOut className="w-4 h-4" />
              <span>End Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Scanning Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Camera Video Stream & Viewfinder (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-900 text-sm">Live QR Camera</span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isScannerPaused
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {isScannerPaused ? "Paused" : "Live Detecting"}
              </span>
            </div>

            {/* Continuous Camera Feed */}
            <QRScannerEngine
              onScan={handleScan}
              isPaused={isScannerPaused}
              disabled={scannerState === "FINALIZING"}
            />

            <p className="text-[11px] text-gray-500 text-center">
              Position student QR card inside the camera frame. Detection is automatic.
            </p>
          </div>

          {/* Quick Session Guidelines */}
          <div className="bg-blue-50/75 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Continuous Scanning Operation</span>
            </div>
            <p className="text-blue-800 text-[11px] leading-relaxed">
              Verify student identity visually. Press <strong className="font-bold">NEXT</strong> (or hit <kbd className="px-1 py-0.5 bg-white rounded border font-mono">Enter</kbd>) to finalize the meal and immediately scan the next student in line.
            </p>
          </div>
        </div>

        {/* Right Column: Student Result Card & Action Area (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <StudentScanResultCard
            result={currentResult}
            onNext={handleNext}
            isFinalizing={scannerState === "FINALIZING"}
          />

          {/* Recent Queue Activity Trail */}
          {recentLogs.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>Session Scan History</span>
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {sessionStats.totalScanned} Total Scans
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {log.status === "APPROVED" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-gray-900 mr-2">{log.name}</span>
                        <span className="font-mono text-[11px] text-gray-500">
                          {log.studentId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {log.status === "APPROVED" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          Approved
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[11px]">
                          {log.reason || "Rejected"}
                        </span>
                      )}
                      <span className="text-gray-400 font-mono text-[11px]">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
