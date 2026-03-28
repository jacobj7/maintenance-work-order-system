"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "open" | "in_progress" | "on_hold" | "completed" | "cancelled";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  location?: string;
}

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-700 border border-gray-300",
  medium: "bg-blue-100 text-blue-700 border border-blue-300",
  high: "bg-orange-100 text-orange-700 border border-orange-300",
  urgent: "bg-red-100 text-red-700 border border-red-300",
};

const STATUS_STYLES: Record<Status, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  on_hold: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const ALL_STATUSES: Status[] = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

export default function MyWorkOrdersClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/work-orders?assigned=me");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to fetch work orders (${res.status})`,
        );
      }
      const data = await res.json();
      setWorkOrders(data.workOrders ?? data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load work orders",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: Status) {
    setUpdatingId(id);
    setUpdateError((prev) => ({ ...prev, [id]: "" }));

    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Update failed (${res.status})`);
      }

      const updated = await res.json();
      const updatedOrder: WorkOrder = updated.workOrder ?? updated;

      setWorkOrders((prev) =>
        prev.map((wo) => (wo.id === id ? { ...wo, ...updatedOrder } : wo)),
      );
    } catch (err) {
      setUpdateError((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Update failed",
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredOrders = workOrders.filter((wo) => {
    const statusMatch = filterStatus === "all" || wo.status === filterStatus;
    const priorityMatch =
      filterPriority === "all" || wo.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading your work orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-700 font-medium mb-2">
          Failed to load work orders
        </p>
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button
          onClick={fetchWorkOrders}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Work Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            {workOrders.length} total · {filteredOrders.length} shown
          </p>
        </div>
        <button
          onClick={fetchWorkOrders}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-sm font-medium text-gray-600"
          >
            Status:
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | "all")}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-priority"
            className="text-sm font-medium text-gray-600"
          >
            Priority:
          </label>
          <select
            id="filter-priority"
            value={filterPriority}
            onChange={(e) =>
              setFilterPriority(e.target.value as Priority | "all")
            }
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500 font-medium">No work orders found</p>
          <p className="text-gray-400 text-sm mt-1">
            {workOrders.length > 0
              ? "Try adjusting your filters"
              : "You have no assigned work orders"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredOrders.map((wo) => (
            <li
              key={wo.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  {/* Left: Title + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[wo.priority]}`}
                      >
                        {PRIORITY_LABELS[wo.priority]}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[wo.status]}`}
                      >
                        {STATUS_LABELS[wo.status]}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-gray-900 truncate">
                      {wo.title}
                    </h2>
                    {wo.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {wo.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {wo.location && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {wo.location}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Created {format(parseISO(wo.created_at), "MMM d, yyyy")}
                      </span>
                      {wo.updated_at && wo.updated_at !== wo.created_at && (
                        <span className="text-xs text-gray-400">
                          Updated{" "}
                          {format(parseISO(wo.updated_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Status update dropdown */}
                  <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                    <label
                      htmlFor={`status-${wo.id}`}
                      className="text-xs font-medium text-gray-500"
                    >
                      Update Status
                    </label>
                    <div className="relative">
                      <select
                        id={`status-${wo.id}`}
                        value={wo.status}
                        disabled={updatingId === wo.id}
                        onChange={(e) =>
                          handleStatusChange(wo.id, e.target.value as Status)
                        }
                        className={`
                          text-sm border rounded-md px-3 py-1.5 pr-8 bg-white
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${updateError[wo.id] ? "border-red-400" : "border-gray-300"}
                          transition-colors
                        `}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      {updatingId === wo.id && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {updateError[wo.id] && (
                      <p className="text-xs text-red-600 max-w-[200px] text-right">
                        {updateError[wo.id]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
