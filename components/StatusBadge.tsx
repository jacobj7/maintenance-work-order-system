const STATUS_CONFIG = {
  open: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-orange-100 text-orange-800 border border-orange-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
} as const;

export type WorkOrderStatus = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: WorkOrderStatus | string;
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as WorkOrderStatus];

  if (!config) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
