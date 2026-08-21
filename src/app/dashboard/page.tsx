import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { Student, MessCredential, getAbsoluteSemester } from "@/types/database";
import {
  QrCode,
  Utensils,
  Building,
  GraduationCap,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";

export default async function StudentDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch student profile
  const { data: student } = await supabase
    .from("students")
    .select("*, mess:messes(*)")
    .eq("id", user.id)
    .maybeSingle();

  if (!student || !student.is_profile_completed) {
    redirect("/onboarding");
  }

  // Fetch active mess credential
  const { data: credential } = await supabase
    .from("mess_credentials")
    .select("*")
    .eq("student_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  const typedStudent = student as Student;
  const typedCredential = credential as MessCredential | null;
  const absoluteSem = getAbsoluteSemester(typedStudent.year, typedStudent.semester);

  return (
    <div className="space-y-8 py-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-blue-100 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                Student Portal
              </span>
              <StatusBadge status={typedStudent.account_status} type="account" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {typedStudent.name}
            </h1>
            <p className="text-sm text-blue-200 font-mono">
              Student ID: <span className="text-white font-bold">{typedStudent.student_id}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/qr"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-blue-50 text-blue-900 font-bold text-sm rounded-xl shadow-lg shadow-black/10 transition-all"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              {typedCredential ? "View & Print QR Card" : "Generate Mess QR"}
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Identity & Mess Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Assigned Mess */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Assigned
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Current Mess Assignment
            </span>
            <h3 className="text-xl font-bold text-gray-900 mt-1">
              {typedStudent.mess?.name || "Assigned Mess"}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Valid for daily automated meal verification at this mess facility.
            </p>
          </div>
        </div>

        {/* Card 2: QR Credential Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <QrCode className="w-5 h-5" />
            </div>
            {typedCredential ? (
              <StatusBadge status={typedCredential.status} type="credential" />
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Pending Generation
              </span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Mess QR Card
            </span>
            {typedCredential ? (
              <div className="mt-1">
                <div className="text-sm font-mono font-bold text-gray-800 truncate">
                  {typedCredential.qr_token}
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active digital card ready
                </p>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-xs text-amber-700 font-medium">
                  No active QR credential generated yet.
                </p>
                <Link
                  href="/dashboard/qr"
                  className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block"
                >
                  Click here to generate your QR →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Academic & Hostel Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-gray-500">
              Year {typedStudent.year} • Sem {typedStudent.semester}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Program & Residence
            </span>
            <div className="text-sm font-bold text-gray-900 mt-1 truncate">
              {typedStudent.course}
            </div>
            <div className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              <span>{typedStudent.hostel}</span>
              <span className="text-gray-400">• Sem {absoluteSem}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Future Functionality Placeholders Section */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Upcoming Services</h2>
          <span className="text-xs text-gray-500 font-mono">
            Phase 1 Foundation Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 opacity-75">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4" />
              <span>Meal Verification History</span>
            </div>
            <p className="text-xs text-gray-600">
              Daily breakfast, lunch, and dinner scan logs.
            </p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              Phase 2 / Phase 4
            </span>
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 opacity-75">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Billing & Invoices</span>
            </div>
            <p className="text-xs text-gray-600">
              Daily and monthly mess fee statements.
            </p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              Version 2
            </span>
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 opacity-75">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
              <Calendar className="w-4 h-4" />
              <span>Mess Leave Application</span>
            </div>
            <p className="text-xs text-gray-600">
              Apply for mess leave and automatic billing rebates.
            </p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              Version 3
            </span>
          </div>

          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 opacity-75">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold mb-1">
              <Utensils className="w-4 h-4" />
              <span>Special Meal Ordering</span>
            </div>
            <p className="text-xs text-gray-600">
              Pre-order festival and weekend special feast items.
            </p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              Version 3
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
