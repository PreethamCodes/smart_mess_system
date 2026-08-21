import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPreconfiguredAdminEmail } from "@/lib/auth/roles";
import { getAbsoluteSemester } from "@/types/database";
import {
  Shield,
  UtensilsCrossed,
  Users,
  QrCode,
  CheckCircle2,
  Key,
  ScanLine,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Authoritative Admin Role Verification
  const email = user.email?.toLowerCase();
  let isAdmin = isPreconfiguredAdminEmail(email);

  if (!isAdmin) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role === "ADMIN") {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Use admin client for full directory queries and bootstrap
  let messes: any[] = [];
  let students: any[] = [];
  let credentials: any[] = [];
  let todayTransactions: any[] = [];

  try {
    const adminDb = createAdminClient();

    // Ensure ADMIN role entry exists in user_roles
    try {
      await adminDb.from("user_roles").upsert(
        {
          user_id: user.id,
          role: "ADMIN",
        },
        { onConflict: "user_id,role" }
      );
    } catch {
      // Ignore background bootstrap error
    }

    const todayDate = new Date().toISOString().split("T")[0];

    const [messesRes, studentsRes, credsRes, transRes] = await Promise.all([
      adminDb.from("messes").select("*").order("name", { ascending: true }),
      adminDb.from("students").select("*, mess:messes(name)").order("created_at", { ascending: false }),
      adminDb.from("mess_credentials").select("*").eq("status", "ACTIVE"),
      adminDb.from("meal_transactions").select("*").eq("meal_date", todayDate).order("created_at", { ascending: false }),
    ]);

    messes = messesRes.data || [];
    students = studentsRes.data || [];
    credentials = credsRes.data || [];
    todayTransactions = transRes.data || [];
  } catch (err) {
    console.error("Admin dashboard fetch error:", err);
  }

  const approvedToday = todayTransactions.filter((t) => t.status === "APPROVED").length;

  return (
    <div className="space-y-8 py-6">
      {/* Admin Header with Scanner Launch Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-blue-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-purple-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>University Dining Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              University Mess Administration
            </h1>
            <p className="text-xs text-purple-200 font-mono">
              Signed in as Administrator: {user.email}
            </p>
          </div>

          {/* Quick Scanner Launch Button */}
          <Link
            href="/admin/scanner"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/40 transition-all active:scale-95"
          >
            <ScanLine className="w-5 h-5" />
            <span>Launch Meal Scanner</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Configured Messes
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {messes.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              Mess 1 – Mess 12 Active
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Registered Students
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {students.length}
            </div>
            <span className="text-[11px] text-gray-500">
              {students.filter((s) => s.is_profile_completed).length} Profiles Complete
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Active QR Cards
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {credentials.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              Unique Cards Issued
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
              Today&apos;s Meals
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {approvedToday}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {todayTransactions.length} Total Scans
            </span>
          </div>
        </div>
      </div>

      {/* University Messes Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">University Mess Facilities</h2>
            <p className="text-xs text-gray-500">
              The 12 seeded university dining facilities for student allocation
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            {messes.length} Total Facilities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Facility Name</th>
                <th className="px-6 py-3">Facility ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Assigned Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messes.map((mess) => {
                const count = students.filter((s) => s.assigned_mess_id === mess.id).length;
                return (
                  <tr key={mess.id} className="hover:bg-gray-50/75">
                    <td className="px-6 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                      {mess.name}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-500 truncate max-w-[200px]">
                      {mess.id}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Operational
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                      {count} {count === 1 ? "Student" : "Students"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registered Students Directory */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Student Identity Directory</h2>
          <p className="text-xs text-gray-500">
            Registered students, mandatory profile status, and QR credential linkage
          </p>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No students registered in the database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Student ID</th>
                  <th className="px-6 py-3">Hostel & Program</th>
                  <th className="px-6 py-3">Assigned Mess</th>
                  <th className="px-6 py-3">Profile</th>
                  <th className="px-6 py-3">Active QR Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((st) => {
                  const studentCred = credentials.find((c) => c.student_id === st.id);
                  const absoluteSem = getAbsoluteSemester(st.year, st.semester);
                  return (
                    <tr key={st.id} className="hover:bg-gray-50/75">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-gray-900">{st.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{st.email}</div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs font-bold text-gray-800">
                        {st.student_id}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-600">
                        <div>{st.hostel}</div>
                        <div className="text-gray-400">
                          {st.course} (Y{st.year}/S{st.semester} • Sem {absoluteSem})
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg text-xs border border-blue-200">
                          {st.mess?.name || "Assigned Mess"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {st.is_profile_completed ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Incomplete
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {studentCred ? (
                          <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded border border-gray-300 inline-block">
                            {studentCred.qr_token}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            Not Generated
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Security & Documentation Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-3 text-xs text-gray-600">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <Key className="w-4 h-4 text-purple-600" />
          <span>Continuous Meal Scanning & Approval Engine</span>
        </div>
        <p>
          Administrators operate the continuous meal scanner to authenticate students in dining halls:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-gray-700">
          <li>Select the operational mess facility and meal service window.</li>
          <li>Scan student QR codes via the continuous live camera stream.</li>
          <li>System executes the 6-step server-authoritative eligibility validation.</li>
          <li>Pressing <strong className="text-gray-900">NEXT</strong> finalizes the transaction and automatically resumes the camera for the next student.</li>
        </ol>
      </div>
    </div>
  );
}
