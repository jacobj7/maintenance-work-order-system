const priorityConfig = {
  low: {
    label: "Low",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
};

export type Priority = keyof typeof priorityConfig;

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export default function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? {
    label: priority,
    className: "bg-gray-100 text-gray-800 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
