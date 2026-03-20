"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface StatusHistory {
  id: string;
  status: string;
  changed_at: string;
  changed_by_name: string;
  notes: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  created_by_name: string;
  location: string | null;
  category: string | null;
  status_history: StatusHistory[];
}

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  on_hold: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface WorkOrderDetailClientProps {
  workOrderId: string;
}

export default function WorkOrderDetailClient({
  workOrderId,
}: WorkOrderDetailClientProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const isManager =
    (session?.user as any)?.role === "manager" ||
    (session?.user as any)?.role === "admin";

  useEffect(() => {
    fetchWorkOrder();
    if (isManager) {
      fetchUsers();
    }
  }, [workOrderId, isManager]);

  async function fetchWorkOrder() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/work-orders/${workOrderId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch work order");
      }
      const data = await res.json();
      setWorkOrder(data);
      setNewStatus(data.status);
      setSelectedAssignee(data.assignee_id || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users?role=technician");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      }
    } catch {
      // silently fail
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!workOrder) return;

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    const payload: Record<string, any> = {};

    if (newStatus !== workOrder.status) {
      payload.status = newStatus;
    }
    if (statusNotes.trim()) {
      payload.notes = statusNotes.trim();
    }
    if (isManager && selectedAssignee !== (workOrder.assignee_id || "")) {
      payload.assignee_id = selectedAssignee || null;
    }

    if (Object.keys(payload).length === 0) {
      setUpdateError("No changes to save.");
      setUpdating(false);
      return;
    }

    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update work order");
      }

      setUpdateSuccess(true);
      setStatusNotes("");
      await fetchWorkOrder();

      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading work order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-red-800 font-medium">Error loading work order</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchWorkOrder}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Go back"
            >
              <svg
                className="w-5 h-5"
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
            </button>
            <span className="text-sm text-gray-500">Work Orders</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Created by {workOrder.created_by_name} ·{" "}
            {formatDate(workOrder.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[workOrder.priority] || "bg-gray-100 text-gray-700"}`}
          >
            {workOrder.priority.charAt(0).toUpperCase() +
              workOrder.priority.slice(1)}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[workOrder.status] || "bg-gray-100 text-gray-700"}`}
          >
            {STATUS_LABELS[workOrder.status] || workOrder.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Description
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {workOrder.description || "No description provided."}
            </p>
          </div>

          {/* Update Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Update Work Order
            </h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              {isManager && (
                <div>
                  <label
                    htmlFor="assignee"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Assignee
                  </label>
                  <select
                    id="assignee"
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note about this update..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {updateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-700 text-sm">{updateError}</p>
                </div>
              )}

              {updateSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-green-600 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-green-700 text-sm">
                    Work order updated successfully.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>

          {/* Status History Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Status History
            </h2>
            {workOrder.status_history && workOrder.status_history.length > 0 ? (
              <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                {workOrder.status_history.map((entry, index) => (
                  <li key={entry.id} className="ml-6">
                    <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 ring-4 ring-white">
                      <svg
                        className="w-3 h-3 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[entry.status] || "bg-gray-100 text-gray-700"}`}
                          >
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          {index === 0 && (
                            <span className="text-xs text-blue-600 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Changed by{" "}
                          <span className="font-medium text-gray-800">
                            {entry.changed_by_name}
                          </span>
                        </p>
                        {entry.notes && (
                          <p className="text-sm text-gray-500 mt-1 italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {formatDate(entry.changed_at)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-400 text-sm">
                No status history available.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Details
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">
                  Status
                </dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[workOrder.status] || "bg-gray-100 text-gray-700"}`}
                  >
                    {STATUS_LABELS[workOrder.status] || workOrder.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">
                  Priority
                </dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[workOrder.priority] || "bg-gray-100 text-gray-700"}`}
                  >
                    {workOrder.priority.charAt(0).toUpperCase() +
                      workOrder.priority.slice(1)}
                  </span>
                </dd>
              </div>
              {workOrder.category && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">
                    Category
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-800">
                    {workOrder.category}
                  </dd>
                </div>
              )}
              {workOrder.location && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide">
                    Location
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-800">
                    {workOrder.location}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">
                  Due Date
                </dt>
                <dd className="mt-0.5 text-sm text-gray-800">
                  {formatDateShort(workOrder.due_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-sm text-gray-800">
                  {formatDate(workOrder.updated_at)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Assignee Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Assignee
            </h2>
            {workOrder.assignee_name ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-semibold text-sm">
                    {workOrder.assignee_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {workOrder.assignee_name}
                  </p>
                  {workOrder.assignee_email && (
                    <p className="text-xs text-gray-500 truncate">
                      {workOrder.assignee_email}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <svg
                  className="w-5 h-5"
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
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>

          {/* Created By Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Created By
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-semibold text-sm">
                  {workOrder.created_by_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {workOrder.created_by_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateShort(workOrder.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
