import React from "react";

type Priority = "low" | "medium" | "high" | "critical";

interface PriorityBadgeProps {
  priority: Priority | string;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; classes: string }> = {
  low: {
    label: "Low",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
  medium: {
    label: "Medium",
    classes: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  high: {
    label: "High",
    classes: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  critical: {
    label: "Critical",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  classes: "bg-gray-100 text-gray-800 border border-gray-200",
};

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const normalizedPriority = priority?.toLowerCase() as Priority;
  const config = priorityConfig[normalizedPriority] ?? defaultConfig;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default PriorityBadge;
