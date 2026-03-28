"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  changed_by_name: string;
  notes: string | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  location: string | null;
  asset_name: string | null;
  requester_name: string;
  assigned_technician_name: string | null;
  created_at: string;
  updated_at: string;
  status_history: StatusHistory[];
}

interface WorkOrderDetailClientProps {
  workOrder: WorkOrder;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Open: ["In Progress"],
  "In Progress": ["On Hold", "Resolved"],
  "On Hold": ["In Progress"],
  Resolved: [],
  Closed: [],
};

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "On Hold": "bg-orange-100 text-orange-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

export default function WorkOrderDetailClient({
  workOrder,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentWorkOrder, setCurrentWorkOrder] =
    useState<WorkOrder>(workOrder);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isTechnician =
    (session?.user as { role?: string })?.role === "Technician";
  const availableTransitions =
    STATUS_TRANSITIONS[currentWorkOrder.status] ?? [];

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      setError("Please select a status.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/work-orders/${currentWorkOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      const updated: WorkOrder = await response.json();
      setCurrentWorkOrder(updated);
      setSelectedStatus("");
      setNotes("");
      setSuccessMessage(`Status updated to "${updated.status}" successfully.`);
      router.refresh();
    } catch (err: unknown) {
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentWorkOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Work Order #{currentWorkOrder.id}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[currentWorkOrder.status] ?? "bg-gray-100 text-gray-800"}`}
          >
            {currentWorkOrder.status}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[currentWorkOrder.priority] ?? "bg-gray-100 text-gray-700"}`}
          >
            {currentWorkOrder.priority} Priority
          </span>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {currentWorkOrder.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {currentWorkOrder.description}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Requester</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {currentWorkOrder.requester_name}
            </dd>
          </div>
          {currentWorkOrder.assigned_technician_name && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Assigned Technician
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {currentWorkOrder.assigned_technician_name}
              </dd>
            </div>
          )}
          {currentWorkOrder.location && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {currentWorkOrder.location}
              </dd>
            </div>
          )}
          {currentWorkOrder.asset_name && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Asset</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {currentWorkOrder.asset_name}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {format(
                parseISO(currentWorkOrder.created_at),
                "MMM d, yyyy h:mm a",
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {format(
                parseISO(currentWorkOrder.updated_at),
                "MMM d, yyyy h:mm a",
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Technician Status Transition Form */}
      {isTechnician && availableTransitions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Update Status
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select a status...</option>
                {availableTransitions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this status change..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !selectedStatus}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 14.627 0 12 0v4a8 8 0 00-8 8H0c0-2.21.895-4.21 2.343-5.657z"
                      />
                    </svg>
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status History Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Status History
        </h2>

        {currentWorkOrder.status_history.length === 0 ? (
          <p className="text-sm text-gray-500">No status history available.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-6 ml-3">
            {currentWorkOrder.status_history.map((entry, index) => (
              <li key={entry.id} className="ml-6">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-blue-500 ring-4 ring-white">
                  {index === 0 ? (
                    <svg
                      className="w-3 h-3 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <circle cx="10" cy="10" r="5" />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                  )}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {entry.status}
                    </span>
                    <p className="mt-1 text-sm text-gray-700">
                      Changed by{" "}
                      <span className="font-medium">
                        {entry.changed_by_name}
                      </span>
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-gray-500 italic">
                        &ldquo;{entry.notes}&rdquo;
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 whitespace-nowrap sm:text-right">
                    {format(parseISO(entry.changed_at), "MMM d, yyyy h:mm a")}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
