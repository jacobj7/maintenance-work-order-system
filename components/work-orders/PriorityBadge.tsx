"use client";

import React from "react";

type Priority = "low" | "medium" | "high" | "critical";

interface PriorityBadgeProps {
  priority: Priority | string;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: {
    label: "Low",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200",
  },
  medium: {
    label: "Medium",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  high: {
    label: "High",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200",
  },
  critical: {
    label: "Critical",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200",
  },
};

const fallbackConfig = {
  label: "Unknown",
  className:
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200",
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const normalized = (priority ?? "").toLowerCase() as Priority;
  const config = priorityConfig[normalized] ?? fallbackConfig;

  return (
    <span className={config.className}>
      {normalized === "critical" && (
        <svg
          className="mr-1 h-2 w-2 text-red-500"
          fill="currentColor"
          viewBox="0 0 8 8"
          aria-hidden="true"
        >
          <circle cx="4" cy="4" r="3" />
        </svg>
      )}
      {config.label}
    </span>
  );
}
