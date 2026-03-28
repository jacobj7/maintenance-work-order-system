"use client";

import { format, parseISO } from "date-fns";

interface StatusHistoryEntry {
  id: string | number;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  notes?: string | null;
  created_at: string;
}

interface StatusHistoryTimelineProps {
  statusHistory: StatusHistoryEntry[];
}

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    active: "bg-green-100 text-green-800 border-green-300",
    inactive: "bg-gray-100 text-gray-800 border-gray-300",
    approved: "bg-blue-100 text-blue-800 border-blue-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
    completed: "bg-purple-100 text-purple-800 border-purple-300",
    in_progress: "bg-indigo-100 text-indigo-800 border-indigo-300",
    on_hold: "bg-orange-100 text-orange-800 border-orange-300",
    draft: "bg-gray-100 text-gray-600 border-gray-300",
  };
  return colorMap[normalized] ?? "bg-gray-100 text-gray-700 border-gray-300";
}

function getStatusDotColor(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  const dotMap: Record<string, string> = {
    pending: "bg-yellow-400",
    active: "bg-green-500",
    inactive: "bg-gray-400",
    approved: "bg-blue-500",
    rejected: "bg-red-500",
    cancelled: "bg-red-500",
    completed: "bg-purple-500",
    in_progress: "bg-indigo-500",
    on_hold: "bg-orange-400",
    draft: "bg-gray-400",
  };
  return dotMap[normalized] ?? "bg-gray-400";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
}

function formatDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy · h:mm a");
  } catch {
    return dateString;
  }
}

export default function StatusHistoryTimeline({
  statusHistory,
}: StatusHistoryTimelineProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-500">No status history</p>
        <p className="text-xs text-gray-400 mt-1">
          Status changes will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {statusHistory.map((entry, index) => {
          const isLast = index === statusHistory.length - 1;
          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {/* Vertical connector line */}
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex space-x-3">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0">
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${getStatusDotColor(entry.new_status)}`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                    {/* Status transition */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {entry.old_status ? (
                        <>
                          <StatusBadge status={entry.old_status} />
                          <span className="flex items-center text-gray-400">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </span>
                          <StatusBadge status={entry.new_status} />
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-dashed border-gray-300">
                            Initial
                          </span>
                          <span className="flex items-center text-gray-400">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </span>
                          <StatusBadge status={entry.new_status} />
                        </>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="font-medium text-gray-700">
                          {entry.changed_by}
                        </span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <time dateTime={entry.created_at}>
                          {formatDate(entry.created_at)}
                        </time>
                      </span>
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    )}
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
