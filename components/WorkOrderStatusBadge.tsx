import React from "react";

type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

const statusConfig: Record<
  WorkOrderStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string }
> = {
  open: {
    label: "Open",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    borderColor: "border-blue-200",
  },
  in_progress: {
    label: "In Progress",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-200",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    borderColor: "border-gray-200",
  },
};

export function WorkOrderStatusBadge({
  status,
  className = "",
}: WorkOrderStatusBadgeProps): React.ReactElement {
  const config = statusConfig[status] ?? {
    label: status,
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    borderColor: "border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default WorkOrderStatusBadge;
