"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";

interface StatusHistory {
  id: string;
  status: string;
  changedAt: string;
  changedBy: string;
  notes: string | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  requestedBy: string;
  requestedByName: string;
  asset: {
    id: string;
    name: string;
    tag: string;
    type: string;
  } | null;
  location: {
    id: string;
    name: string;
    building: string;
    floor: string | null;
    room: string | null;
  } | null;
  statusHistory: StatusHistory[];
}

interface WorkOrderDetailClientProps {
  workOrder: WorkOrder;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const TIMELINE_ICONS: Record<string, string> = {
  open: "📋",
  in_progress: "🔧",
  on_hold: "⏸️",
  completed: "✅",
  cancelled: "❌",
};

export default function WorkOrderDetailClient({
  workOrder: initialWorkOrder,
}: WorkOrderDetailClientProps) {
  const { data: session } = useSession();
  const [workOrder, setWorkOrder] = useState<WorkOrder>(initialWorkOrder);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const userRole = (session?.user as any)?.role as string | undefined;
  const canTransition =
    userRole === "Technician" || userRole === "FacilitiesManager";
  const availableTransitions = STATUS_TRANSITIONS[workOrder.status] ?? [];

  const handleStatusUpdate = () => {
    if (!selectedStatus) {
      setError("Please select a status to transition to.");
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const body: Record<string, string> = { status: selectedStatus };
        if (completionNotes.trim()) {
          body.completionNotes = completionNotes.trim();
        }

        const res = await fetch(`/api/work-orders/${workOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error || `Request failed with status ${res.status}`,
          );
        }

        const updated: WorkOrder = await res.json();
        setWorkOrder(updated);
        setSelectedStatus("");
        setCompletionNotes("");
        setSuccess(
          `Status updated to "${STATUS_LABELS[selectedStatus] ?? selectedStatus}" successfully.`,
        );
      } catch (err: any) {
        setError(err.message || "Failed to update status.");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Work Order #{workOrder.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[workOrder.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {STATUS_LABELS[workOrder.status] ?? workOrder.status}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[workOrder.priority] ?? "bg-gray-100 text-gray-700"}`}
          >
            {workOrder.priority.charAt(0).toUpperCase() +
              workOrder.priority.slice(1)}{" "}
            Priority
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {workOrder.description}
            </p>
          </section>

          {/* Completion Notes */}
          {workOrder.completionNotes && (
            <section className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-3">
                Completion Notes
              </h2>
              <p className="text-green-800 whitespace-pre-wrap">
                {workOrder.completionNotes}
              </p>
            </section>
          )}

          {/* Asset & Location */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Asset & Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {workOrder.asset ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Asset
                  </h3>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {workOrder.asset.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Tag: {workOrder.asset.tag}
                    </p>
                    <p className="text-sm text-gray-600">
                      Type: {workOrder.asset.type}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Asset
                  </h3>
                  <p className="text-gray-400 italic">No asset linked</p>
                </div>
              )}

              {workOrder.location ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Location
                  </h3>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {workOrder.location.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Building: {workOrder.location.building}
                    </p>
                    {workOrder.location.floor && (
                      <p className="text-sm text-gray-600">
                        Floor: {workOrder.location.floor}
                      </p>
                    )}
                    {workOrder.location.room && (
                      <p className="text-sm text-gray-600">
                        Room: {workOrder.location.room}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Location
                  </h3>
                  <p className="text-gray-400 italic">No location linked</p>
                </div>
              )}
            </div>
          </section>

          {/* Status Transition Form */}
          {canTransition && availableTransitions.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Update Status
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="status-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Transition to Status
                  </label>
                  <select
                    id="status-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isPending}
                  >
                    <option value="">— Select new status —</option>
                    {availableTransitions.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="completion-notes"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Notes{" "}
                    {selectedStatus === "completed" && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <textarea
                    id="completion-notes"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    rows={4}
                    placeholder={
                      selectedStatus === "completed"
                        ? "Describe the work completed..."
                        : "Optional notes about this status change..."
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={isPending}
                  />
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={isPending || !selectedStatus}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Updating..." : "Update Status"}
                </button>
              </div>
            </section>
          )}

          {/* Status History Timeline */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Status History
            </h2>
            {workOrder.statusHistory.length === 0 ? (
              <p className="text-gray-400 italic">
                No status history available.
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 space-y-6 ml-3">
                {workOrder.statusHistory.map((entry, index) => (
                  <li key={entry.id} className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-white border-2 border-gray-300 rounded-full text-xs">
                      {TIMELINE_ICONS[entry.status] ?? "•"}
                    </span>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {STATUS_LABELS[entry.status] ?? entry.status}
                        </span>
                        {index === 0 && (
                          <span className="text-xs text-blue-600 font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Changed by{" "}
                        <span className="font-medium text-gray-700">
                          {entry.changedBy}
                        </span>
                        {" · "}
                        {format(
                          parseISO(entry.changedAt),
                          "MMM d, yyyy h:mm a",
                        )}
                      </p>
                      {entry.notes && (
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Category
                </dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {workOrder.category.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Requested By
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workOrder.requestedByName || workOrder.requestedBy}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Assigned To
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workOrder.assignedToName || workOrder.assignedTo || (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(parseISO(workOrder.createdAt), "MMM d, yyyy")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(parseISO(workOrder.updatedAt), "MMM d, yyyy h:mm a")}
                </dd>
              </div>
              {workOrder.dueDate && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Due Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(parseISO(workOrder.dueDate), "MMM d, yyyy")}
                  </dd>
                </div>
              )}
              {workOrder.completedAt && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Completed At
                  </dt>
                  <dd className="mt-1 text-sm text-green-700 font-medium">
                    {format(
                      parseISO(workOrder.completedAt),
                      "MMM d, yyyy h:mm a",
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick Status Badge */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Current Status
            </h2>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${STATUS_COLORS[workOrder.status] ?? "bg-gray-100 text-gray-700"}`}
            >
              <span>{TIMELINE_ICONS[workOrder.status] ?? "•"}</span>
              <span>{STATUS_LABELS[workOrder.status] ?? workOrder.status}</span>
            </div>
            {!canTransition && availableTransitions.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                You do not have permission to update this work order's status.
              </p>
            )}
            {availableTransitions.length === 0 && (
              <p className="mt-3 text-xs text-gray-500">
                This work order is in a terminal state and cannot be
                transitioned further.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
