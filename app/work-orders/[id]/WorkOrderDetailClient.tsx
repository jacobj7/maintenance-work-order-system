"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  completionNotes: string | null;
  signedOffAt: string | null;
  signedOffBy: string | null;
  createdAt: string;
  updatedAt: string;
  location: string | null;
  category: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
}

interface WorkOrderDetailClientProps {
  workOrder: WorkOrder;
  technicians: Technician[];
  userRole: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  high: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function WorkOrderDetailClient({
  workOrder,
  technicians,
  userRole,
}: WorkOrderDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  const [status, setStatus] = useState(workOrder.status);
  const [priority, setPriority] = useState(workOrder.priority);
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    workOrder.assignedTechnicianId ?? "",
  );
  const [completionNotes, setCompletionNotes] = useState(
    workOrder.completionNotes ?? "",
  );
  const [actualHours, setActualHours] = useState(
    workOrder.actualHours?.toString() ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOff, setIsSigningOff] = useState(false);

  const isManager = userRole === "manager" || userRole === "admin";
  const isTechnician = userRole === "technician";
  const isSignedOff = !!workOrder.signedOffAt;

  const patchWorkOrder = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/work-orders/${workOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.error ?? `Request failed with status ${response.status}`,
      );
    }

    return response.json();
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const payload: Record<string, unknown> = {
        status,
        priority,
        completionNotes: completionNotes || null,
        actualHours: actualHours ? parseFloat(actualHours) : null,
      };

      if (isManager) {
        payload.assignedTechnicianId = assignedTechnicianId || null;
      }

      await patchWorkOrder(payload);
      setSuccessMessage("Work order updated successfully.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update work order.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOff = async () => {
    if (
      !window.confirm(
        "Are you sure you want to sign off on this work order? This action cannot be undone.",
      )
    ) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSigningOff(true);

    try {
      await patchWorkOrder({
        status: "completed",
        signOff: true,
        completionNotes: completionNotes || null,
        actualHours: actualHours ? parseFloat(actualHours) : null,
      });
      setStatus("completed");
      setSuccessMessage("Work order signed off successfully.");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign off work order.",
      );
    } finally {
      setIsSigningOff(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasChanges =
    status !== workOrder.status ||
    priority !== workOrder.priority ||
    assignedTechnicianId !== (workOrder.assignedTechnicianId ?? "") ||
    completionNotes !== (workOrder.completionNotes ?? "") ||
    actualHours !== (workOrder.actualHours?.toString() ?? "");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
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
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Work Orders</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">ID: {workOrder.id}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}
          >
            {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status}
          </span>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[priority]}`}
          >
            {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ??
              priority}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
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
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {isSignedOff && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">
              This work order has been signed off
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Signed off by {workOrder.signedOffBy} on{" "}
              {formatDate(workOrder.signedOffAt)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {workOrder.description || "No description provided."}
            </p>
          </div>

          {/* Status & Priority Controls */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Status & Priority
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as WorkOrder["status"])
                  }
                  disabled={isSignedOff}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as WorkOrder["priority"])
                  }
                  disabled={isSignedOff || !isManager}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Completion Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Completion Notes
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes
                <span className="text-gray-400 font-normal ml-1">
                  (optional)
                </span>
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                disabled={isSignedOff}
                rows={5}
                placeholder="Enter completion notes, observations, or any relevant details..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Actual Hours
              </label>
              <input
                type="number"
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
                disabled={isSignedOff}
                min="0"
                step="0.5"
                placeholder="0.0"
                className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {!isSignedOff && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || isSigningOff || !hasChanges}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>

              {(isManager || isTechnician) && status === "in_progress" && (
                <button
                  onClick={handleSignOff}
                  disabled={isSaving || isSigningOff}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSigningOff ? (
                    <>
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Signing Off...
                    </>
                  ) : (
                    <>
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
                      Sign Off
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Technician Assignment (Manager Only) */}
          {isManager && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Technician Assignment
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assigned Technician
                </label>
                <select
                  value={assignedTechnicianId}
                  onChange={(e) => setAssignedTechnicianId(e.target.value)}
                  disabled={isSignedOff}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">— Unassigned —</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Work Order Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Details
            </h2>
            <dl className="space-y-3">
              {workOrder.location && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Location
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {workOrder.location}
                  </dd>
                </div>
              )}
              {workOrder.category && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {workOrder.category}
                  </dd>
                </div>
              )}
              {workOrder.estimatedHours != null && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Estimated Hours
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {workOrder.estimatedHours}h
                  </dd>
                </div>
              )}
              {!isManager && workOrder.assignedTechnicianName && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {workOrder.assignedTechnicianName}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {formatDate(workOrder.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Updated
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {formatDate(workOrder.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Sign-off Info */}
          {isSignedOff && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Sign-off Information
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Signed Off By
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {workOrder.signedOffBy ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Signed Off At
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {formatDate(workOrder.signedOffAt)}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
