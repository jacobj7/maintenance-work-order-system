"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";
type WorkOrderPriority = "low" | "medium" | "high" | "critical";

interface StatusHistoryEntry {
  id: string;
  status: WorkOrderStatus;
  changed_by: string;
  changed_at: string;
  notes?: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assigned_technician?: string;
  created_at: string;
  updated_at: string;
  location?: string;
  requester?: string;
  status_history: StatusHistoryEntry[];
}

interface WorkOrderDetailClientProps {
  workOrder: WorkOrder;
  technicians: { id: string; name: string }[];
}

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  on_hold: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_TIMELINE_COLORS: Record<WorkOrderStatus, string> = {
  open: "bg-blue-500",
  in_progress: "bg-yellow-500",
  on_hold: "bg-orange-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WorkOrderDetailClient({
  workOrder,
  technicians,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WorkOrderStatus>(workOrder.status);
  const [assignedTechnician, setAssignedTechnician] = useState(
    workOrder.assigned_technician || "",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, string> = { status };
      if (assignedTechnician) payload.assigned_technician = assignedTechnician;
      if (notes.trim()) payload.notes = notes.trim();

      const response = await fetch(`/api/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      setSuccessMessage("Work order updated successfully.");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            Work Order #{workOrder.id}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[workOrder.status]}`}
          >
            {formatLabel(workOrder.status)}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${PRIORITY_COLORS[workOrder.priority]}`}
          >
            {formatLabel(workOrder.priority)} Priority
          </span>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Description</p>
            <p className="text-gray-800 mt-1 whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </div>
          {workOrder.location && (
            <div>
              <p className="text-gray-500 font-medium">Location</p>
              <p className="text-gray-800 mt-1">{workOrder.location}</p>
            </div>
          )}
          {workOrder.requester && (
            <div>
              <p className="text-gray-500 font-medium">Requester</p>
              <p className="text-gray-800 mt-1">{workOrder.requester}</p>
            </div>
          )}
          {workOrder.assigned_technician && (
            <div>
              <p className="text-gray-500 font-medium">Assigned Technician</p>
              <p className="text-gray-800 mt-1">
                {workOrder.assigned_technician}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-500 font-medium">Created</p>
            <p className="text-gray-800 mt-1">
              {formatDate(workOrder.created_at)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Last Updated</p>
            <p className="text-gray-800 mt-1">
              {formatDate(workOrder.updated_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Status History Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Status History
        </h2>
        {workOrder.status_history.length === 0 ? (
          <p className="text-sm text-gray-500">No status history available.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-6 ml-3">
            {workOrder.status_history.map((entry, index) => (
              <li key={entry.id} className="ml-6">
                <span
                  className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${STATUS_TIMELINE_COLORS[entry.status]}`}
                >
                  {index === 0 && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[entry.status]}`}
                    >
                      {formatLabel(entry.status)}
                    </span>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-gray-600 italic">
                        "{entry.notes}"
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Changed by{" "}
                      <span className="font-medium text-gray-700">
                        {entry.changed_by}
                      </span>
                    </p>
                  </div>
                  <time className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(entry.changed_at)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Update Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Update Work Order
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkOrderStatus)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Assign Technician */}
            <div>
              <label
                htmlFor="technician"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Assign Technician
              </label>
              {technicians.length > 0 ? (
                <select
                  id="technician"
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Unassigned —</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="technician"
                  type="text"
                  value={assignedTechnician}
                  onChange={(e) => setAssignedTechnician(e.target.value)}
                  placeholder="Enter technician name or ID"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add a note about this status change..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Feedback */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
