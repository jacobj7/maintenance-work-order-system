const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
  },
  in_progress: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
  },
  on_hold: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
  },
  draft: {
    bg: "bg-gray-50",
    text: "text-gray-800",
    border: "border-gray-200",
  },
  approved: {
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  rejected: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  scheduled: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  overdue: {
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-300",
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  scheduled: "Scheduled",
  overdue: "Overdue",
};

const DEFAULT_STYLE = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  border: "border-gray-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") ?? "";
  const styles = STATUS_STYLES[normalizedStatus] ?? DEFAULT_STYLE;
  const label = STATUS_LABELS[normalizedStatus] ?? status ?? "Unknown";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      {label}
    </span>
  );
}
