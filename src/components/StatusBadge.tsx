import React from "react";
import { AccountStatus, CredentialStatus } from "@/types/database";

interface StatusBadgeProps {
  status: AccountStatus | CredentialStatus | string;
  type?: "account" | "credential";
}

export function StatusBadge({ status, type = "account" }: StatusBadgeProps) {
  let badgeColor = "bg-gray-100 text-gray-800 border-gray-200";

  if (status === "ACTIVE") {
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-300";
  } else if (status === "BLOCKED") {
    badgeColor = "bg-rose-50 text-rose-700 border-rose-300";
  } else if (status === "DEACTIVATED" || status === "SUSPENDED" || status === "INACTIVE") {
    badgeColor = "bg-amber-50 text-amber-700 border-amber-300";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "ACTIVE"
            ? "bg-emerald-500"
            : status === "BLOCKED"
            ? "bg-rose-500"
            : "bg-amber-500"
        }`}
      />
      {status}
    </span>
  );
}
