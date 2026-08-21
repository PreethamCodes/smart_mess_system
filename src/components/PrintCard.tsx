"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Student, MessCredential, getAbsoluteSemester } from "@/types/database";
import { Utensils } from "lucide-react";

interface PrintCardProps {
  student: Student;
  credential: MessCredential;
}

export function PrintCard({ student, credential }: PrintCardProps) {
  const absoluteSem = getAbsoluteSemester(student.year, student.semester);

  return (
    <div className="hidden print:block print:w-[3.375in] print:h-[2.125in] print:m-auto print:border print:border-gray-800 print:rounded-lg print:p-3 print:bg-white print:text-black print:overflow-hidden font-sans">
      <div className="flex items-center justify-between border-b border-gray-400 pb-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Utensils className="w-4 h-4 text-black" />
          <span className="font-bold text-[11px] uppercase tracking-wide">
            Univ. of Hyderabad • Mess Card
          </span>
        </div>
        <span className="font-bold text-[10px] bg-black text-white px-1.5 py-0.2 rounded">
          {student.mess?.name || "Mess"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Student Info */}
        <div className="flex-1 text-[9px] leading-tight space-y-0.5">
          <div className="font-bold text-[11px] text-black">{student.name}</div>
          <div>
            <span className="font-semibold">Student ID:</span> {student.student_id}
          </div>
          <div>
            <span className="font-semibold">Hostel:</span> {student.hostel}
          </div>
          <div>
            <span className="font-semibold">Prog:</span> {student.course}
          </div>
          <div>
            <span className="font-semibold">Year/Sem:</span> Year {student.year}, Sem {student.semester} (Sem {absoluteSem})
          </div>
          <div className="font-mono text-[8px] font-bold mt-1 text-gray-800">
            {credential.qr_token}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center p-1 border border-gray-400 rounded bg-white">
          <QRCodeSVG
            value={credential.qr_token}
            size={88}
            level="H"
            includeMargin={false}
          />
        </div>
      </div>

      <div className="mt-1 pt-1 border-t border-gray-300 flex justify-between text-[7px] text-gray-600">
        <span>Official Mess ID Credential</span>
        <span>Status: {credential.status}</span>
      </div>
    </div>
  );
}
