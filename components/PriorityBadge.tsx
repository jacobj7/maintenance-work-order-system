const priorityConfig: Record<string, { label: string; className: string }> = {
  low: {
    label: "Low",
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-700 border border-red-200",
  },
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export default function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const normalizedPriority = priority?.toLowerCase() ?? "";
  const config = priorityConfig[normalizedPriority] ?? {
    label: priority ?? "Unknown",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
