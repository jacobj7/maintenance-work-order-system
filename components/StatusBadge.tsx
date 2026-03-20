type Status = "open" | "assigned" | "in_progress" | "completed" | "cancelled";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; classes: string }> = {
  open: {
    label: "Open",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
  },
  assigned: {
    label: "Assigned",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-orange-100 text-orange-800 border-orange-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-green-100 text-green-800 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200 ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

export type { Status };
