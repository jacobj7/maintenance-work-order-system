"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";

type WorkOrder = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  created_at: string;
  due_date?: string;
};

type Props = {
  workOrders: WorkOrder[];
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
  urgent: "bg-red-200 text-red-900 font-semibold",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function capitalize(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkOrderListClient({ workOrders }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") ?? "";
  const currentPriority = searchParams.get("priority") ?? "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label
            htmlFor="status-filter"
            className="text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={currentStatus}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="priority-filter"
            className="text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="priority-filter"
            value={currentPriority}
            onChange={(e) => updateFilter("priority", e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {(currentStatus || currentPriority) && (
          <button
            onClick={() => {
              const params = new URLSearchParams();
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500">
          {workOrders.length} work order{workOrders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {workOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 text-sm">No work orders found.</p>
          {(currentStatus || currentPriority) && (
            <p className="text-gray-400 text-xs mt-1">
              Try adjusting your filters.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Title
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Priority
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Assignee
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Due Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workOrders.map((wo) => (
                <tr
                  key={wo.id}
                  className="hover:bg-gray-50 transition-colors duration-100"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/dashboard/work-orders/${wo.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {wo.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[wo.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {capitalize(wo.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        PRIORITY_STYLES[wo.priority] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {capitalize(wo.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {wo.assignee ?? "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(wo.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(wo.due_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      href={`/dashboard/work-orders/${wo.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
