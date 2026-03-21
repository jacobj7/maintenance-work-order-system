"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  changed_by_name: string;
  notes: string | null;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  location: string | null;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  created_by_name: string;
  status_history: StatusHistory[];
  available_technicians?: Technician[];
}

interface WorkOrderDetailClientProps {
  workOrder: WorkOrder;
  userRole: string;
}

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}

export default function WorkOrderDetailClient({
  workOrder,
  userRole,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const isSupervisor = userRole === "supervisor" || userRole === "admin";

  const [selectedStatus, setSelectedStatus] = useState(workOrder.status);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(
    workOrder.assigned_technician_id ?? "",
  );
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          notes: statusNotes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      setStatusSuccess("Status updated successfully.");
      setStatusNotes("");
      router.refresh();
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleAssignTechnician(e: React.FormEvent) {
    e.preventDefault();
    setIsAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_technician_id: selectedTechnicianId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign technician");
      }

      setAssignSuccess("Technician assigned successfully.");
      router.refresh();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Work Order #{workOrder.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            label={workOrder.priority}
            colorClass={
              PRIORITY_COLORS[workOrder.priority] ?? "bg-gray-100 text-gray-800"
            }
          />
          <Badge
            label={workOrder.status}
            colorClass={
              STATUS_COLORS[workOrder.status] ?? "bg-gray-100 text-gray-800"
            }
          />
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Description</span>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">
              {workOrder.description || "—"}
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-600">Location</span>
              <p className="mt-1 text-gray-900">{workOrder.location || "—"}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Created By</span>
              <p className="mt-1 text-gray-900">{workOrder.created_by_name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Created At</span>
              <p className="mt-1 text-gray-900">
                {formatDate(workOrder.created_at)}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Last Updated</span>
              <p className="mt-1 text-gray-900">
                {formatDate(workOrder.updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Assignment */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Current Assignment
        </h2>
        {workOrder.assigned_technician_name ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              {workOrder.assigned_technician_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {workOrder.assigned_technician_name}
              </p>
              <p className="text-xs text-gray-500">Assigned Technician</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No technician assigned yet.
          </p>
        )}
      </div>

      {/* Supervisor Controls */}
      {isSupervisor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assign Technician Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Assign Technician
            </h2>
            <form onSubmit={handleAssignTechnician} className="space-y-4">
              <div>
                <label
                  htmlFor="technician"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Technician
                </label>
                <select
                  id="technician"
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Unassigned —</option>
                  {(workOrder.available_technicians ?? []).map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>

              {assignError && (
                <p className="text-sm text-red-600">{assignError}</p>
              )}
              {assignSuccess && (
                <p className="text-sm text-green-600">{assignSuccess}</p>
              )}

              <button
                type="submit"
                disabled={isAssigning}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAssigning ? "Assigning…" : "Assign Technician"}
              </button>
            </form>
          </div>

          {/* Status Update Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Update Status
            </h2>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Status
                </label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason for status change…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {statusError && (
                <p className="text-sm text-red-600">{statusError}</p>
              )}
              {statusSuccess && (
                <p className="text-sm text-green-600">{statusSuccess}</p>
              )}

              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdatingStatus ? "Updating…" : "Update Status"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Status History Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          Status History
        </h2>
        {workOrder.status_history.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No status history available.
          </p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-6 ml-3">
            {workOrder.status_history.map((entry, index) => (
              <li key={entry.id} className="ml-6">
                <span
                  className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                    index === 0 ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <svg
                    className={`h-3 w-3 ${index === 0 ? "text-white" : "text-gray-600"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge
                    label={entry.status}
                    colorClass={
                      STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-800"
                    }
                  />
                  <time className="text-xs text-gray-500">
                    {formatDate(entry.changed_at)}
                  </time>
                </div>
                <p className="text-sm text-gray-700">
                  Changed by{" "}
                  <span className="font-medium">{entry.changed_by_name}</span>
                </p>
                {entry.notes && (
                  <p className="mt-1 text-sm text-gray-500 italic">
                    "{entry.notes}"
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
