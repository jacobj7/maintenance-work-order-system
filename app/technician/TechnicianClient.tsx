"use client";

import { useState } from "react";

interface WorkOrder {
  id: number;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  location: string;
  assigned_to: string;
  created_at: string;
  completion_notes?: string;
}

interface TechnicianClientProps {
  initialWorkOrders: WorkOrder[];
}

const PRIORITY_ORDER: Record<WorkOrder["priority"], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const PRIORITY_STYLES: Record<WorkOrder["priority"], string> = {
  Critical: "bg-red-100 text-red-800 border-red-200",
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Low: "bg-green-100 text-green-800 border-green-200",
};

const PRIORITY_BADGE: Record<WorkOrder["priority"], string> = {
  Critical: "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-yellow-500 text-white",
  Low: "bg-green-500 text-white",
};

const STATUS_STYLES: Record<WorkOrder["status"], string> = {
  Pending: "bg-gray-100 text-gray-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
};

export default function TechnicianClient({
  initialWorkOrders,
}: TechnicianClientProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(
    [...initialWorkOrders].sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    ),
  );
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [successIds, setSuccessIds] = useState<Set<number>>(new Set());

  const handleNoteChange = (id: number, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const updateWorkOrder = async (id: number, status: WorkOrder["status"]) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: "" }));

    const completionNotes = notes[id] || "";

    try {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completion_notes: completionNotes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${res.status}`,
        );
      }

      const updated: WorkOrder = await res.json();

      setWorkOrders((prev) =>
        [...prev.map((wo) => (wo.id === id ? { ...wo, ...updated } : wo))].sort(
          (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
        ),
      );

      setSuccessIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      setTimeout(() => {
        setSuccessIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrors((prev) => ({ ...prev, [id]: message }));
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          No Work Orders Assigned
        </h2>
        <p className="text-gray-500">
          You have no work orders assigned to you at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {workOrders.filter((wo) => wo.status !== "Completed").length} active
            · {workOrders.filter((wo) => wo.status === "Completed").length}{" "}
            completed
          </p>
        </div>
        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {workOrders.length} total
        </span>
      </div>

      {workOrders.map((wo) => (
        <div
          key={wo.id}
          className={`rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-200 ${
            wo.status === "Completed"
              ? "opacity-75 border-gray-200 bg-gray-50"
              : PRIORITY_STYLES[wo.priority]
          }`}
        >
          {/* Card Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-base font-semibold text-gray-900 leading-tight flex-1">
                {wo.title}
              </h2>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[wo.priority]}`}
                >
                  {wo.priority}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[wo.status]}`}
                >
                  {wo.status}
                </span>
              </div>
            </div>

            {wo.description && (
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                {wo.description}
              </p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              {wo.location && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
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
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
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
                {new Date(wo.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Completion Notes */}
          {wo.status !== "Completed" && (
            <div className="px-4 pb-3">
              <label
                htmlFor={`notes-${wo.id}`}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Completion Notes (optional)
              </label>
              <textarea
                id={`notes-${wo.id}`}
                rows={2}
                value={notes[wo.id] || ""}
                onChange={(e) => handleNoteChange(wo.id, e.target.value)}
                placeholder="Add notes about the work performed..."
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white placeholder-gray-400"
                disabled={loading[wo.id]}
              />
            </div>
          )}

          {/* Existing completion notes (read-only) */}
          {wo.status === "Completed" && wo.completion_notes && (
            <div className="px-4 pb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Completion Notes
              </p>
              <p className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-200">
                {wo.completion_notes}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errors[wo.id] && (
            <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">{errors[wo.id]}</p>
            </div>
          )}

          {/* Success Message */}
          {successIds.has(wo.id) && (
            <div className="mx-4 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-medium">
                ✓ Work order updated successfully
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {wo.status !== "Completed" && (
            <div className="px-4 pb-4 flex gap-2">
              {wo.status !== "In Progress" && (
                <button
                  onClick={() => updateWorkOrder(wo.id, "In Progress")}
                  disabled={loading[wo.id]}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  {loading[wo.id] ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    "Start — In Progress"
                  )}
                </button>
              )}
              <button
                onClick={() => updateWorkOrder(wo.id, "Completed")}
                disabled={loading[wo.id]}
                className="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              >
                {loading[wo.id] ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Updating...
                  </span>
                ) : (
                  "✓ Mark Completed"
                )}
              </button>
            </div>
          )}

          {wo.status === "Completed" && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-700 font-medium">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Completed
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
