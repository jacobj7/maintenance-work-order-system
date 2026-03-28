const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",
  },
  in_progress: {
    label: "In Progress",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800",
  },
  completed: {
    label: "Completed",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800",
  },
};

const DEFAULT_CONFIG = {
  label: "Unknown",
  className:
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? DEFAULT_CONFIG;

  return (
    <span className={`${config.className}${className ? ` ${className}` : ""}`}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
