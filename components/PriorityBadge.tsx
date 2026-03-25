"use client";

import React from "react";

type Priority = "low" | "medium" | "high" | "urgent";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? priorityConfig.low;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          priority === "low"
            ? "bg-gray-500"
            : priority === "medium"
              ? "bg-blue-500"
              : priority === "high"
                ? "bg-orange-500"
                : "bg-red-500"
        }`}
      />
      {config.label}
    </span>
  );
}

export default PriorityBadge;
