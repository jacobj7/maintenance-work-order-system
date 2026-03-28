"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";

export interface WorkOrder {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "on_hold" | "completed" | "cancelled";
  asset: string;
  assignedTo: string;
  dueDate: string;
}

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
}

const PRIORITY_COLORS: Record<WorkOrder["priority"], string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<WorkOrder["status"], string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  on_hold: "bg-gray-100 text-gray-600",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-500",
};

const PRIORITY_LABELS: Record<WorkOrder["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STATUS_LABELS: Record<WorkOrder["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    WorkOrder["priority"] | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<WorkOrder["status"] | "all">(
    "all",
  );
  const [sortField, setSortField] = useState<keyof WorkOrder>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof WorkOrder) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = [...workOrders];

    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(
        (wo) =>
          wo.id.toLowerCase().includes(lower) ||
          wo.title.toLowerCase().includes(lower) ||
          wo.asset.toLowerCase().includes(lower) ||
          wo.assignedTo.toLowerCase().includes(lower),
      );
    }

    if (priorityFilter !== "all") {
      result = result.filter((wo) => wo.priority === priorityFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((wo) => wo.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    workOrders,
    search,
    priorityFilter,
    statusFilter,
    sortField,
    sortDirection,
  ]);

  const SortIcon = ({ field }: { field: keyof WorkOrder }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300 select-none">↕</span>;
    }
    return (
      <span className="ml-1 text-gray-600 select-none">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const formatDueDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by ID, title, asset, or assignee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as WorkOrder["priority"] | "all")
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">All Priorities</option>
          {(Object.keys(PRIORITY_LABELS) as WorkOrder["priority"][]).map(
            (p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ),
          )}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as WorkOrder["status"] | "all")
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as WorkOrder["status"][]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500 whitespace-nowrap">
          {filtered.length} of {workOrders.length} work orders
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {(
                [
                  { label: "ID", field: "id" },
                  { label: "Title", field: "title" },
                  { label: "Priority", field: "priority" },
                  { label: "Status", field: "status" },
                  { label: "Asset", field: "asset" },
                  { label: "Assigned To", field: "assignedTo" },
                  { label: "Due Date", field: "dueDate" },
                ] as { label: string; field: keyof WorkOrder }[]
              ).map(({ label, field }) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
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
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No work orders match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                    {wo.id}
                  </td>
                  <td
                    className="px-4 py-3 text-gray-900 max-w-xs truncate"
                    title={wo.title}
                  >
                    {wo.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[wo.priority]}`}
                    >
                      {PRIORITY_LABELS[wo.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[wo.status]}`}
                    >
                      {STATUS_LABELS[wo.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {wo.asset}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {wo.assignedTo}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDueDate(wo.dueDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
