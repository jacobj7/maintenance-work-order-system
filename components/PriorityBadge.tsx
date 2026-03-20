type Priority = "low" | "medium" | "high" | "critical";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig: Record<Priority, { label: string; classes: string }> = {
  low: {
    label: "Low",
    classes: "bg-gray-100 text-gray-700 ring-gray-200",
  },
  medium: {
    label: "Medium",
    classes: "bg-blue-100 text-blue-700 ring-blue-200",
  },
  high: {
    label: "High",
    classes: "bg-orange-100 text-orange-700 ring-orange-200",
  },
  critical: {
    label: "Critical",
    classes: "bg-red-100 text-red-700 ring-red-200",
  },
};

export default function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  if (!config) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export type { Priority };
