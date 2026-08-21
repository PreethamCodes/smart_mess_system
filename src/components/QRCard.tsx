"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Student, MessCredential, getAbsoluteSemester } from "@/types/database";
import { StatusBadge } from "./StatusBadge";
import { ShieldCheck, Utensils, Printer, UserCircle } from "lucide-react";

interface QRCardProps {
  student: Student;
  credential?: MessCredential | null;
  onPrint?: () => void;
}

export function QRCard({ student, credential, onPrint }: QRCardProps) {
  const absoluteSem = getAbsoluteSemester(student.year, student.semester);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-md mx-auto transition-all">
      {/* Card Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">University of Hyderabad</h3>
              <p className="text-xs text-blue-200 font-medium">Smart Mess Credential Card</p>
            </div>
          </div>
          {credential && <StatusBadge status={credential.status} type="credential" />}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Student Identity Details */}
        <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
          <div className="w-16 h-16 rounded-xl bg-gray-100 border-2 border-blue-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircle className="w-12 h-12 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 text-lg leading-tight truncate">
              {student.name}
            </h4>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 font-mono">
              <span className="font-semibold text-gray-900">Student ID:</span>
              <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-800">
                {student.student_id}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500 truncate">
              {student.course} • Year {student.year}, Sem {student.semester} (Sem {absoluteSem})
            </div>
          </div>
        </div>

        {/* Assigned Mess & Hostel Row */}
        <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
          <div>
            <span className="text-gray-500 block uppercase tracking-wider text-[10px] font-semibold">
              Assigned Mess
            </span>
            <span className="font-bold text-blue-900 text-sm">
              {student.mess?.name || "Assigned Mess"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase tracking-wider text-[10px] font-semibold">
              Hostel
            </span>
            <span className="font-bold text-gray-900 text-sm truncate block">
              {student.hostel}
            </span>
          </div>
        </div>

        {/* QR Code Section */}
        {credential ? (
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            {/* The QR is strictly encoded with the opaque token ONLY */}
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
              <QRCodeSVG
                value={credential.qr_token}
                size={180}
                level="H"
                includeMargin={true}
                className="w-44 h-44"
              />
            </div>

            {/* Opaque Credential Token Label */}
            <div className="mt-3 text-center">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold block">
                Opaque Credential Token
              </span>
              <span className="font-mono text-xs font-bold text-gray-800 bg-gray-200/70 px-2.5 py-1 rounded-md mt-0.5 inline-block">
                {credential.qr_token}
              </span>
            </div>

            <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Opaque Payload • No PII Stored</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600">No active QR credential issued yet.</p>
            <p className="text-xs text-gray-500 mt-1">
              Click the button below to generate your unique mess card.
            </p>
          </div>
        )}

        {/* Actions */}
        {credential && onPrint && (
          <div className="mt-5 print:hidden">
            <button
              onClick={onPrint}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl shadow-md shadow-blue-500/20 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Physical QR Card
            </button>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-[11px] text-gray-500 flex justify-between items-center">
        <span>Student ID: {student.student_id}</span>
        <span>Status: {student.account_status}</span>
      </div>
    </div>
  );
}
