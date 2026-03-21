"use client";

import React from "react";

export type WorkOrderStatus =
  | "Open"
  | "In Progress"
  | "Completed"
  | "Cancelled";

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  Open: {
    label: "Open",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
  },
  "In Progress": {
    label: "In Progress",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  Completed: {
    label: "Completed",
    classes: "bg-green-100 text-green-800 border-green-200",
  },
  Cancelled: {
    label: "Cancelled",
    classes: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  classes: "bg-gray-100 text-gray-600 border-gray-200",
};

export function WorkOrderStatusBadge({
  status,
  className = "",
}: WorkOrderStatusBadgeProps) {
  const config = statusConfig[status] ?? { ...defaultConfig, label: status };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === "Open"
            ? "bg-blue-500"
            : status === "In Progress"
              ? "bg-yellow-500"
              : status === "Completed"
                ? "bg-green-500"
                : "bg-gray-400"
        }`}
      />
      {config.label}
    </span>
  );
}

export default WorkOrderStatusBadge;
