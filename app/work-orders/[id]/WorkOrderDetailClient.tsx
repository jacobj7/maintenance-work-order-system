"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { WorkOrder, WorkOrderStatus } from "@/lib/types";

const STATUS_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open: ["in_progress"],
  in_progress: ["on_hold", "completed"],
  on_hold: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

interface LaborEntry {
  id: number;
  technician_name: string;
  hours_worked: number;
  work_date: string;
  notes?: string;
}

interface PartEntry {
  id: number;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit_cost: number;
}

interface WorkOrderDetail extends WorkOrder {
  asset_name?: string;
  asset_tag?: string;
  location_name?: string;
  assigned_technician_name?: string;
  labor_entries?: LaborEntry[];
  parts_used?: PartEntry[];
}

interface Props {
  workOrderId: string;
}

export default function WorkOrderDetailClient({ workOrderId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Labor form
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [laborHours, setLaborHours] = useState("");
  const [laborDate, setLaborDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [laborNotes, setLaborNotes] = useState("");
  const [laborSubmitting, setLaborSubmitting] = useState(false);

  // Parts form
  const [showPartsForm, setShowPartsForm] = useState(false);
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [partUnitCost, setPartUnitCost] = useState("");
  const [partsSubmitting, setPartsSubmitting] = useState(false);

  // Assign form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [technicians, setTechnicians] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/work-orders/${workOrderId}`);
      if (!res.ok) throw new Error("Failed to fetch work order");
      const data = await res.json();
      setWorkOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await fetch("/api/technicians");
        if (res.ok) {
          const data = await res.json();
          setTechnicians(data);
        }
      } catch {
        // ignore
      }
    };
    fetchTechnicians();
  }, []);

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    if (!workOrder) return;
    setStatusUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      await fetchWorkOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaborSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours_worked: parseFloat(laborHours),
          work_date: laborDate,
          notes: laborNotes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add labor entry");
      }
      setShowLaborForm(false);
      setLaborHours("");
      setLaborNotes("");
      setLaborDate(new Date().toISOString().split("T")[0]);
      await fetchWorkOrder();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add labor entry",
      );
    } finally {
      setLaborSubmitting(false);
    }
  };

  const handlePartsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_name: partName,
          part_number: partNumber || undefined,
          quantity: parseInt(partQuantity),
          unit_cost: parseFloat(partUnitCost),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add part");
      }
      setShowPartsForm(false);
      setPartName("");
      setPartNumber("");
      setPartQuantity("1");
      setPartUnitCost("");
      await fetchWorkOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add part");
    } finally {
      setPartsSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${workOrderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technician_id: parseInt(selectedTechnician) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign technician");
      }
      setShowAssignForm(false);
      setSelectedTechnician("");
      await fetchWorkOrder();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to assign technician",
      );
    } finally {
      setAssignSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Work order not found.</p>
        </div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === "admin";
  const isTechnician = session?.user?.role === "technician";
  const allowedTransitions = STATUS_TRANSITIONS[workOrder.status] || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">WO-{workOrder.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={workOrder.status} />
          <PriorityBadge priority={workOrder.priority} />
        </div>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Details</h2>
          <div className="space-y-3 text-sm">
            {workOrder.description && (
              <div>
                <span className="font-medium text-gray-600">Description:</span>
                <p className="mt-1 text-gray-800">{workOrder.description}</p>
              </div>
            )}
            {workOrder.asset_name && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Asset:</span>
                <span className="text-gray-800">{workOrder.asset_name}</span>
              </div>
            )}
            {workOrder.location_name && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Location:</span>
                <span className="text-gray-800">{workOrder.location_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Created:</span>
              <span className="text-gray-800">
                {new Date(workOrder.created_at).toLocaleDateString()}
              </span>
            </div>
            {workOrder.due_date && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Due Date:</span>
                <span className="text-gray-800">
                  {new Date(workOrder.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Assignment</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-600">Assigned To:</span>
              <span className="text-gray-800">
                {workOrder.assigned_technician_name || "Unassigned"}
              </span>
            </div>
          </div>
          {isAdmin && (
            <div>
              {!showAssignForm ? (
                <button
                  onClick={() => setShowAssignForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {workOrder.assigned_technician_name
                    ? "Reassign"
                    : "Assign Technician"}
                </button>
              ) : (
                <form onSubmit={handleAssignSubmit} className="space-y-3">
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select technician...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={assignSubmitting}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {assignSubmitting ? "Assigning..." : "Assign"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAssignForm(false)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Transitions */}
      {(isAdmin || isTechnician) && allowedTransitions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Update Status
          </h2>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={statusUpdating}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 capitalize"
              >
                {statusUpdating
                  ? "Updating..."
                  : `Mark as ${status.replace("_", " ")}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Labor Entries */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Labor</h2>
          {(isAdmin || isTechnician) && (
            <button
              onClick={() => setShowLaborForm(!showLaborForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Labor
            </button>
          )}
        </div>

        {showLaborForm && (
          <form
            onSubmit={handleLaborSubmit}
            className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours Worked
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={laborHours}
                  onChange={(e) => setLaborHours(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={laborDate}
                  onChange={(e) => setLaborDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={laborNotes}
                onChange={(e) => setLaborNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={laborSubmitting}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {laborSubmitting ? "Saving..." : "Save Labor"}
              </button>
              <button
                type="button"
                onClick={() => setShowLaborForm(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {workOrder.labor_entries && workOrder.labor_entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Technician
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Hours
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {workOrder.labor_entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 text-gray-800">
                      {entry.technician_name}
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      {new Date(entry.work_date).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      {entry.hours_worked}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {entry.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No labor entries recorded.</p>
        )}
      </div>

      {/* Parts Used */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Parts Used</h2>
          {(isAdmin || isTechnician) && (
            <button
              onClick={() => setShowPartsForm(!showPartsForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Part
            </button>
          )}
        </div>

        {showPartsForm && (
          <form
            onSubmit={handlePartsSubmit}
            className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Name
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Filter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number
                </label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={partUnitCost}
                  onChange={(e) => setPartUnitCost(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={partsSubmitting}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {partsSubmitting ? "Saving..." : "Save Part"}
              </button>
              <button
                type="button"
                onClick={() => setShowPartsForm(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {workOrder.parts_used && workOrder.parts_used.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Part Name
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Part #
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Qty
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Unit Cost
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {workOrder.parts_used.map((part) => (
                  <tr
                    key={part.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-3 text-gray-800">
                      {part.part_name}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {part.part_number || "-"}
                    </td>
                    <td className="py-2 px-3 text-gray-800">{part.quantity}</td>
                    <td className="py-2 px-3 text-gray-800">
                      ${Number(part.unit_cost).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-800">
                      ${(Number(part.unit_cost) * part.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No parts recorded.</p>
        )}
      </div>
    </div>
  );
}
