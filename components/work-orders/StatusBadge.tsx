"use client";

import React from "react";

type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

interface StatusBadgeProps {
  status: WorkOrderStatus | string;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; ring: string }
> = {
  open: {
    label: "Open",
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-600/20",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    ring: "ring-yellow-600/20",
  },
  on_hold: {
    label: "On Hold",
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-600/20",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-50",
    text: "text-green-700",
    ring: "ring-green-600/20",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-600/20",
  },
};

const defaultConfig = {
  label: "Unknown",
  bg: "bg-gray-50",
  text: "text-gray-700",
  ring: "ring-gray-600/20",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase().replace(/\s+/g, "_") ?? "";
  const config = statusConfig[normalized] ?? {
    ...defaultConfig,
    label:
      status
        ?.split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") ?? "Unknown",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
    >
      {config.label}
    </span>
  );
}
