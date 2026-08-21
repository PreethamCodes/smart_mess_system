"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QrCode, User, LogOut, Shield, UtensilsCrossed, Menu, X } from "lucide-react";

interface NavbarProps {
  userEmail?: string | null;
  role?: "STUDENT" | "ADMIN" | null;
  isProfileCompleted?: boolean;
}

export function Navbar({ userEmail, role, isProfileCompleted }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!userEmail) return null;

  const isAdmin = role === "ADMIN";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 leading-tight block">
                  Smart Mess System
                </span>
                <span className="text-xs text-blue-600 font-medium leading-tight block">
                  University of Hyderabad
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {!isAdmin && isProfileCompleted && (
                <>
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === "/dashboard"
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/qr"
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      pathname === "/dashboard/qr"
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    My Mess QR
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith("/admin")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Console
                </Link>
              )}
            </nav>
          </div>

          {/* Right Side: User info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                  isAdmin
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {isAdmin ? "ADMIN" : "STUDENT"}
              </span>
              <span className="text-gray-600 font-mono text-xs max-w-[200px] truncate">
                {userEmail}
              </span>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-gray-200"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-4 space-y-2">
          <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Signed in as
            </div>
            <div className="text-sm font-mono text-gray-800 truncate">{userEmail}</div>
            <div className="mt-1">
              <span
                className={`inline-block font-semibold px-2 py-0.5 rounded text-[10px] ${
                  isAdmin
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {isAdmin ? "ADMIN" : "STUDENT"}
              </span>
            </div>
          </div>

          {!isAdmin && isProfileCompleted && (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/qr"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                My Mess QR Card
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              Admin Console
            </Link>
          )}

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-5 h-5" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
