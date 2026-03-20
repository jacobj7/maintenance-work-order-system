const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Pending",
  },
  in_progress: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    label: "In Progress",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "Cancelled",
  },
  on_hold: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    label: "On Hold",
  },
  scheduled: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    label: "Scheduled",
  },
  open: {
    bg: "bg-cyan-100",
    text: "text-cyan-800",
    label: "Open",
  },
  closed: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    label: "Closed",
  },
  draft: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    label: "Draft",
  },
  approved: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-100",
    text: "text-rose-800",
    label: "Rejected",
  },
  overdue: {
    bg: "bg-red-200",
    text: "text-red-900",
    label: "Overdue",
  },
};

const DEFAULT_STYLE = {
  bg: "bg-gray-100",
  text: "text-gray-700",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

export function StatusBadge({
  status,
  className = "",
  size = "md",
}: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") ?? "";
  const style = STATUS_STYLES[normalizedStatus] ?? DEFAULT_STYLE;
  const label =
    STATUS_STYLES[normalizedStatus]?.label ??
    (status
      ? status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
      : "Unknown");

  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${style.bg} ${style.text} ${className}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
