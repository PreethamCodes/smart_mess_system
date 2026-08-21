import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAbsoluteSemester } from "@/types/database";
import {
  Shield,
  UtensilsCrossed,
  Users,
  QrCode,
  CheckCircle2,
  Key,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check Admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleData?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Use admin client for full directory queries
  let messes: any[] = [];
  let students: any[] = [];
  let credentials: any[] = [];

  try {
    const adminDb = createAdminClient();

    const [messesRes, studentsRes, credsRes] = await Promise.all([
      adminDb.from("messes").select("*").order("name", { ascending: true }),
      adminDb.from("students").select("*, mess:messes(name)").order("created_at", { ascending: false }),
      adminDb.from("mess_credentials").select("*").eq("status", "ACTIVE"),
    ]);

    messes = messesRes.data || [];
    students = studentsRes.data || [];
    credentials = credsRes.data || [];
  } catch (err) {
    console.error("Admin dashboard fetch error:", err);
  }

  return (
    <div className="space-y-8 py-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-blue-900 rounded-3xl text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-purple-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>Phase 1 Administrative Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              University Mess Administration
            </h1>
            <p className="text-xs text-purple-200 font-mono">
              Signed in as Administrator: {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
              Mess 1 – Mess 10 Active
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
              Active QR Credentials
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {credentials.length}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              Unique Opaque Cards Issued
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
              The 10 seeded university dining facilities for student allocation
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

      {/* Admin Security & Bootstrap Documentation Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-3 text-xs text-gray-600">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <Key className="w-4 h-4 text-purple-600" />
          <span>Admin Role Authorization & Bootstrap Architecture</span>
        </div>
        <p>
          Administrators in Phase 1 are managed strictly through server-side authorization. To bootstrap an administrator:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-gray-700">
          <li>
            Add the authorized university email to the <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-purple-700">ADMIN_EMAILS</code> environment variable.
          </li>
          <li>
            Register / Log in with that university email account.
          </li>
          <li>
            The system grants the account the server-verified <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-purple-700">ADMIN</code> role in <code className="font-mono">public.user_roles</code>.
          </li>
        </ol>
        <p className="text-[11px] text-gray-500">
          Client-side role escalation is strictly prohibited by Row Level Security (RLS) policies and database constraints.
        </p>
      </div>
    </div>
  );
}
