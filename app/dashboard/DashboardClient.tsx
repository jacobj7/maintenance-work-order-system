"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";

interface WorkOrder {
  id: string;
  title: string;
  status: "open" | "in_progress" | "overdue" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  assignee: string | null;
  created_at: string;
  due_date: string | null;
}

interface Stats {
  open: number;
  in_progress: number;
  overdue: number;
  completed: number;
}

interface DashboardClientProps {
  stats: Stats;
  workOrders: WorkOrder[];
}

const statusConfig: Record<
  WorkOrder["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  open: {
    label: "Open",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    dot: "bg-yellow-500",
  },
  overdue: {
    label: "Overdue",
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
  },
};

const priorityConfig: Record<
  WorkOrder["priority"],
  { label: string; bg: string; text: string; border: string }
> = {
  low: {
    label: "Low",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
  },
  medium: {
    label: "Medium",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  high: {
    label: "High",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  critical: {
    label: "Critical",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-400",
  },
};

const statCards = [
  {
    key: "open" as const,
    label: "Open",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    valueColor: "text-blue-700",
  },
  {
    key: "in_progress" as const,
    label: "In Progress",
    icon: (
      <svg
        className="w-6 h-6"
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
    ),
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    valueColor: "text-yellow-700",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    valueColor: "text-red-700",
  },
  {
    key: "completed" as const,
    label: "Completed",
    icon: (
      <svg
        className="w-6 h-6"
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
    ),
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    valueColor: "text-green-700",
  },
];

type SortField =
  | "title"
  | "status"
  | "priority"
  | "created_at"
  | "due_date"
  | "assignee";
type SortDir = "asc" | "desc";

const priorityOrder: Record<WorkOrder["priority"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const statusOrder: Record<WorkOrder["status"], number> = {
  overdue: 4,
  in_progress: 3,
  open: 2,
  completed: 1,
};

export default function DashboardClient({
  stats,
  workOrders,
}: DashboardClientProps) {
  const [filterStatus, setFilterStatus] = useState<WorkOrder["status"] | "all">(
    "all",
  );
  const [filterPriority, setFilterPriority] = useState<
    WorkOrder["priority"] | "all"
  >("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = workOrders
    .filter((wo) => {
      if (filterStatus !== "all" && wo.status !== filterStatus) return false;
      if (filterPriority !== "all" && wo.priority !== filterPriority)
        return false;
      if (
        search.trim() &&
        !wo.title.toLowerCase().includes(search.toLowerCase()) &&
        !(wo.assignee ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "priority":
          cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "due_date":
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else
            cmp =
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case "assignee":
          cmp = (a.assignee ?? "").localeCompare(b.assignee ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return (
        <svg
          className="w-4 h-4 text-gray-400 ml-1 inline"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    return sortDir === "asc" ? (
      <svg
        className="w-4 h-4 text-indigo-600 ml-1 inline"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-indigo-600 ml-1 inline"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl border ${card.border} ${card.bg} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
            onClick={() =>
              setFilterStatus(filterStatus === card.key ? "all" : card.key)
            }
            role="button"
            aria-pressed={filterStatus === card.key}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setFilterStatus(filterStatus === card.key ? "all" : card.key);
              }
            }}
          >
            <div
              className={`flex-shrink-0 rounded-lg p-3 ${card.bg} ${card.color} border ${card.border}`}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`text-3xl font-bold ${card.valueColor}`}>
                {stats[card.key]}
              </p>
            </div>
            {filterStatus === card.key && (
              <span className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
                Filtered
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search title or assignee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as WorkOrder["status"] | "all")
              }
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(
                  e.target.value as WorkOrder["priority"] | "all",
                )
              }
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {(filterStatus !== "all" || filterPriority !== "all" || search) && (
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterPriority("all");
                  setSearch("");
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    { field: "title", label: "Title" },
                    { field: "status", label: "Status" },
                    { field: "priority", label: "Priority" },
                    { field: "assignee", label: "Assignee" },
                    { field: "created_at", label: "Created" },
                    { field: "due_date", label: "Due Date" },
                  ] as { field: SortField; label: string }[]
                ).map(({ field, label }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
                  >
                    {label}
                    <SortIcon field={field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-400 text-sm"
                  >
                    No work orders match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((wo) => {
                  const sc = statusConfig[wo.status];
                  const pc = priorityConfig[wo.priority];
                  return (
                    <tr
                      key={wo.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 max-w-xs truncate">
                        {wo.title}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                          />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold ${pc.bg} ${pc.text} ${pc.border}`}
                        >
                          {pc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {wo.assignee ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center uppercase">
                              {wo.assignee.charAt(0)}
                            </span>
                            <span>{wo.assignee}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                        {format(parseISO(wo.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                        {wo.due_date ? (
                          <span
                            className={
                              wo.status === "overdue"
                                ? "text-red-600 font-semibold"
                                : "text-gray-500"
                            }
                          >
                            {format(parseISO(wo.due_date), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between rounded-b-xl">
          <span>
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {workOrders.length}
            </span>{" "}
            work orders
          </span>
          {filtered.length !== workOrders.length && (
            <span className="text-indigo-600 font-medium">Filters active</span>
          )}
        </div>
      </div>
    </div>
  );
}
