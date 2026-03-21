import React from "react";

type Priority = "low" | "medium" | "high" | "urgent";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<
  Priority,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  low: {
    label: "Low",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    borderColor: "border-gray-300",
  },
  medium: {
    label: "Medium",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
  },
  high: {
    label: "High",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-300",
  },
  urgent: {
    label: "Urgent",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
};

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  if (!config) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default PriorityBadge;
