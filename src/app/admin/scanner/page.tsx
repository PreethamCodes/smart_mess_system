"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mess, MealType } from "@/types/database";
import {
  MEAL_SCHEDULES,
  ALL_MEAL_TYPES,
  getCurrentActiveMeal,
  getMealDisplayName,
  getMealTimeWindow,
  isMealAvailableNow,
} from "@/lib/meals/config";
import ContinuousMealScanner from "@/components/scanner/ContinuousMealScanner";
import {
  UtensilsCrossed,
  Shield,
  ArrowLeft,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AdminScannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [messes, setMesses] = useState<Mess[]>([]);
  const [selectedMessId, setSelectedMessId] = useState<string>("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("LUNCH");
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Initial Authorization & Mess Directory Load
  useEffect(() => {
    async function initAdminScanner() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Verify session & Admin role
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login?redirectedFrom=/admin/scanner");
          return;
        }

        // Fetch configured active messes
        const { data: messesData, error: messErr } = await supabase
          .from("messes")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (messErr) throw messErr;

        setMesses(messesData || []);
        if (messesData && messesData.length > 0) {
          setSelectedMessId(messesData[0].id);
        }

        // Auto-select current active meal if one is currently operational
        const currentActive = getCurrentActiveMeal();
        if (currentActive) {
          setSelectedMeal(currentActive);
        }
      } catch (err: any) {
        console.error("Scanner setup initialization error:", err);
        setAuthError(err.message || "Failed to initialize scanner console.");
      } finally {
        setLoading(false);
      }
    }

    initAdminScanner();
  }, [router]);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessId || !selectedMeal) return;
    setIsSessionActive(true);
  };

  const selectedMess = messes.find((m) => m.id === selectedMessId);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <p className="text-sm font-medium text-gray-500">Loading meal approval console...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-900">Access Error</h2>
          <p className="text-xs text-rose-700">{authError}</p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Active Session Scanning Mode
  if (isSessionActive && selectedMess) {
    return (
      <div className="py-4 sm:py-6">
        <ContinuousMealScanner
          messId={selectedMess.id}
          messName={selectedMess.name}
          mealType={selectedMeal}
          onEndSession={() => setIsSessionActive(false)}
        />
      </div>
    );
  }

  // Pre-Session Configuration Mode
  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admin Directory</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          <span>Meal Approval Engine</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-10 space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Start Meal Scanning Session
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            Configure the dining mess facility and current meal window before activating the live QR camera.
          </p>
        </div>

        <form onSubmit={handleStartSession} className="space-y-6">
          {/* Mess Selection Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Select University Mess Facility *
            </label>
            <select
              value={selectedMessId}
              onChange={(e) => setSelectedMessId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-sm font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {messes.map((mess) => (
                <option key={mess.id} value={mess.id}>
                  {mess.name} (Active Dining Facility)
                </option>
              ))}
            </select>
          </div>

          {/* Meal Type Radio Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Select Meal Service Window *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ALL_MEAL_TYPES.map((type) => {
                const schedule = MEAL_SCHEDULES[type];
                const isSelected = selectedMeal === type;
                const isOperational = isMealAvailableNow(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedMeal(type)}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-600 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-gray-900 text-sm">{schedule.displayName}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{schedule.description}</span>
                    </div>

                    {isOperational && (
                      <span className="mt-2 inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ● Operational Now
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Session CTA Button */}
          <button
            type="submit"
            disabled={!selectedMessId}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START MEAL APPROVAL</span>
          </button>
        </form>

        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-[11px] text-gray-500 text-center space-y-1">
          <p className="font-semibold text-gray-700">Continuous Queue Workflow</p>
          <p>
            Once started, the camera remains active continuously. Scanning a student displays their eligibility and photo. Pressing <strong className="text-gray-800">NEXT</strong> automatically records the result and resumes scanning for the next student.
          </p>
        </div>
      </div>
    </div>
  );
}
