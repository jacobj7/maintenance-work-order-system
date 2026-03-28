"use client";

import { format, parseISO } from "date-fns";

interface StatusHistoryEntry {
  id: number;
  work_order_id: number;
  old_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  changed_by_email: string | null;
  changed_at: string;
  notes: string | null;
}

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
}

const statusColors: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  open: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  on_hold: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
  completed: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    dot: "bg-red-500",
  },
};

const defaultColors = {
  bg: "bg-gray-50",
  text: "text-gray-800",
  border: "border-gray-200",
  dot: "bg-gray-500",
};

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusColors(status: string) {
  return statusColors[status.toLowerCase()] ?? defaultColors;
}

function StatusBadge({ status }: { status: string }) {
  const colors = getStatusColors(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy h:mm a");
  } catch {
    return dateString;
  }
}

export default function StatusHistoryTimeline({
  history,
}: StatusHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="mx-auto h-10 w-10 text-gray-300 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">No status history available.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          const newColors = getStatusColors(entry.new_status);

          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white bg-white flex-shrink-0">
                    <span
                      className={`h-3 w-3 rounded-full ${newColors.dot}`}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.old_status ? (
                          <>
                            <StatusBadge status={entry.old_status} />
                            <svg
                              className="h-4 w-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                            <StatusBadge status={entry.new_status} />
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-500 italic">
                              Created as
                            </span>
                            <StatusBadge status={entry.new_status} />
                          </>
                        )}
                      </div>

                      {entry.notes && (
                        <p className="mt-1.5 text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
                          {entry.notes}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <svg
                          className="h-3.5 w-3.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                          />
                        </svg>
                        <span>
                          {entry.changed_by_name
                            ? entry.changed_by_name
                            : entry.changed_by_email
                              ? entry.changed_by_email
                              : "System"}
                        </span>
                        {entry.changed_by_email && entry.changed_by_name && (
                          <span className="text-gray-400">
                            ({entry.changed_by_email})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="whitespace-nowrap text-right text-xs text-gray-500 flex-shrink-0 pt-0.5">
                      <time dateTime={entry.changed_at}>
                        {formatDateTime(entry.changed_at)}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
