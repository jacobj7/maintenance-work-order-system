"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  assigned_name: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface SummaryCards {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
  urgent: "bg-red-200 text-red-900 font-bold",
};

export default function PageClient() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [summary, setSummary] = useState<SummaryCards>({
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
  });
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    workOrderId: string | null;
    currentAssigned: string | null;
  }>({
    open: false,
    workOrderId: null,
    currentAssigned: null,
  });
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const res = await fetch(`/api/work-orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch work orders");
      const data = await res.json();
      setWorkOrders(data.workOrders ?? []);
      setSummary(
        data.summary ?? { total: 0, open: 0, in_progress: 0, completed: 0 },
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch("/api/technicians");
      if (!res.ok) return;
      const data = await res.json();
      setTechnicians(data.technicians ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  const openAssignModal = (
    workOrderId: string,
    currentAssigned: string | null,
  ) => {
    setAssignModal({ open: true, workOrderId, currentAssigned });
    setSelectedTechnician(currentAssigned ?? "");
    setAssignError(null);
  };

  const closeAssignModal = () => {
    setAssignModal({ open: false, workOrderId: null, currentAssigned: null });
    setSelectedTechnician("");
    setAssignError(null);
  };

  const handleAssign = async () => {
    if (!assignModal.workOrderId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(
        `/api/work-orders/${assignModal.workOrderId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technicianId: selectedTechnician || null }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to assign technician");
      }
      closeAssignModal();
      fetchWorkOrders();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Manager Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Manage and track all work orders</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            label="Total"
            value={summary.total}
            color="bg-white border-l-4 border-indigo-500"
            textColor="text-indigo-600"
          />
          <SummaryCard
            label="Open"
            value={summary.open}
            color="bg-white border-l-4 border-blue-500"
            textColor="text-blue-600"
          />
          <SummaryCard
            label="In Progress"
            value={summary.in_progress}
            color="bg-white border-l-4 border-yellow-500"
            textColor="text-yellow-600"
          />
          <SummaryCard
            label="Completed"
            value={summary.completed}
            color="bg-white border-l-4 border-green-500"
            textColor="text-green-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Priority:
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <button
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
            }}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear Filters
          </button>
        </div>

        {/* Work Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-600">
              <p className="font-medium">Error loading work orders</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={fetchWorkOrders}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg font-medium">No work orders found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/work-orders/${order.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                        >
                          {order.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                          {order.description}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.customer_name ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[order.priority] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {order.assigned_name ?? (
                          <span className="text-gray-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/work-orders/${order.id}`}
                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() =>
                              openAssignModal(order.id, order.assigned_to)
                            }
                            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Technician Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeAssignModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Technician
            </h2>

            {assignError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {assignError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Technician
              </label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Unassign —</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeAssignModal}
                disabled={assigning}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {assigning && (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {assigning ? "Assigning..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: number;
  color: string;
  textColor: string;
}) {
  return (
    <div className={`rounded-xl shadow-sm p-5 ${color}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  );
}
