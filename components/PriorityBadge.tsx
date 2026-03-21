"use client";

import React from "react";

export type Priority = "Low" | "Medium" | "High" | "Critical";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; classes: string }> = {
  Low: {
    label: "Low",
    classes: "bg-gray-100 text-gray-700 border-gray-300",
  },
  Medium: {
    label: "Medium",
    classes: "bg-blue-100 text-blue-700 border-blue-300",
  },
  High: {
    label: "High",
    classes: "bg-orange-100 text-orange-700 border-orange-300",
  },
  Critical: {
    label: "Critical",
    classes: "bg-red-100 text-red-700 border-red-300",
  },
};

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? priorityConfig["Low"];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default PriorityBadge;
