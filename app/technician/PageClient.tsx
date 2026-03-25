"use client";

import { useState } from "react";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "on_hold" | "completed";
  customer_name: string;
  customer_address: string;
  scheduled_date: string | null;
  created_at: string;
}

interface PageClientProps {
  initialWorkOrders?: WorkOrder[];
}

const STATUS_OPTIONS = [
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
] as const;

const PRIORITY_COLORS: Record<WorkOrder["priority"], string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<WorkOrder["status"], string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  on_hold: "bg-gray-100 text-gray-700",
  completed: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<WorkOrder["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

export default function PageClient({ initialWorkOrders }: PageClientProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>(
    {},
  );

  const handleStatusChange = (orderId: string, value: string) => {
    setSelectedStatus((prev) => ({ ...prev, [orderId]: value }));
  };

  const handleStatusUpdate = async (orderId: string) => {
    const newStatus = selectedStatus[orderId];
    if (!newStatus) return;

    setUpdating((prev) => ({ ...prev, [orderId]: true }));
    setErrors((prev) => ({ ...prev, [orderId]: "" }));

    try {
      const response = await fetch(`/api/work-orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      const updated = await response.json();

      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.id === orderId
            ? { ...wo, status: updated.status ?? newStatus }
            : wo,
        ),
      );
      setSelectedStatus((prev) => ({ ...prev, [orderId]: "" }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [orderId]:
          err instanceof Error ? err.message : "Failed to update status",
      }));
    } finally {
      setUpdating((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <svg
          className="w-16 h-16 text-gray-300 mb-4"
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
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No work orders assigned
        </h3>
        <p className="text-gray-500">
          You have no work orders assigned to you at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {workOrders.map((order) => (
        <div
          key={order.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col"
        >
          {/* Card Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-gray-900 leading-snug flex-1">
                {order.title}
              </h3>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[order.priority]}`}
                >
                  {order.priority}
                </span>
              </div>
            </div>

            {order.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {order.description}
              </p>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 space-y-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
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
              <span className="text-sm text-gray-700">
                {order.customer_name}
              </span>
            </div>

            {order.customer_address && (
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
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
                <span className="text-sm text-gray-700">
                  {order.customer_address}
                </span>
              </div>
            )}

            {order.scheduled_date && (
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
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
                <span className="text-sm text-gray-700">
                  {new Date(order.scheduled_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Card Footer — Status Update */}
          <div className="p-5 border-t border-gray-100 bg-gray-50">
            {errors[order.id] && (
              <p className="text-xs text-red-600 mb-2">{errors[order.id]}</p>
            )}
            <div className="flex gap-2">
              <select
                value={selectedStatus[order.id] ?? ""}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                disabled={updating[order.id]}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Update status for ${order.title}`}
              >
                <option value="" disabled>
                  Update status…
                </option>
                {STATUS_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.value === order.status}
                  >
                    {opt.label}
                    {opt.value === order.status ? " (current)" : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleStatusUpdate(order.id)}
                disabled={!selectedStatus[order.id] || updating[order.id]}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Apply status update"
              >
                {updating[order.id] ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  "Apply"
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
