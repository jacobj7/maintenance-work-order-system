"use client";

import { format, parseISO, isPast, isValid } from "date-fns";

interface WorkOrder {
  id: string | number;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  dueDate: string | Date | null;
  status?: string;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onClick?: (workOrder: WorkOrder) => void;
}

const priorityConfig: Record<
  WorkOrder["priority"],
  { label: string; className: string }
> = {
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

function parseDueDate(dueDate: string | Date | null): Date | null {
  if (!dueDate) return null;
  if (dueDate instanceof Date) {
    return isValid(dueDate) ? dueDate : null;
  }
  try {
    const parsed = parseISO(dueDate);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function WorkOrderCard({
  workOrder,
  onClick,
}: WorkOrderCardProps) {
  const { title, priority, category, dueDate, status } = workOrder;

  const parsedDueDate = parseDueDate(dueDate);
  const isOverdue =
    parsedDueDate !== null &&
    isPast(parsedDueDate) &&
    status !== "completed" &&
    status !== "closed";

  const priorityInfo = priorityConfig[priority] ?? priorityConfig.medium;

  const formattedDueDate = parsedDueDate
    ? format(parsedDueDate, "MMM d, yyyy")
    : null;

  return (
    <div
      role="article"
      aria-label={`Work order: ${title}`}
      onClick={() => onClick?.(workOrder)}
      className={[
        "relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-shadow",
        onClick ? "cursor-pointer hover:shadow-md" : "",
        isOverdue ? "border-red-300 bg-red-50" : "border-gray-200",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isOverdue && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Overdue
        </span>
      )}

      <div className="flex items-start justify-between gap-2 pr-16">
        <h3 className="text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
          {title}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityInfo.className}`}
        >
          {priorityInfo.label}
        </span>

        {category && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
            {category}
          </span>
        )}
      </div>

      {formattedDueDate && (
        <div
          className={`flex items-center gap-1.5 text-xs ${
            isOverdue ? "text-red-600 font-medium" : "text-gray-500"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <span className="text-gray-400">Due:</span>{" "}
            <time dateTime={parsedDueDate?.toISOString()}>
              {formattedDueDate}
            </time>
          </span>
        </div>
      )}
    </div>
  );
}
