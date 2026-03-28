import React from "react";

type Priority = "low" | "medium" | "high" | "critical";

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
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
  medium: {
    label: "Medium",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
  },
  high: {
    label: "High",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    borderColor: "border-orange-200",
  },
  critical: {
    label: "Critical",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
  },
};

const dotColorMap: Record<Priority, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const dotColor = dotColorMap[priority];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

export default PriorityBadge;
