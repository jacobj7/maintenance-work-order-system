"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Part {
  id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface Labor {
  id: string;
  technician_name: string;
  hours: number;
  hourly_rate: number;
  total_cost: number;
  work_date: string;
}

interface HistoryEntry {
  id: string;
  changed_at: string;
  changed_by: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  asset_name: string | null;
  location: string | null;
  requestor_email: string | null;
  created_at: string;
  updated_at: string;
  parts: Part[];
  labor: Labor[];
  history: HistoryEntry[];
}

interface PageClientProps {
  workOrder: WorkOrder;
}

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  on_hold: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-purple-100 text-purple-800",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function PageClient({ workOrder }: PageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Status update
  const [selectedStatus, setSelectedStatus] = useState(workOrder.status);
  const [statusNotes, setStatusNotes] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  // Parts form
  const [partName, setPartName] = useState("");
  const [partQty, setPartQty] = useState("");
  const [partUnitCost, setPartUnitCost] = useState("");
  const [partError, setPartError] = useState("");
  const [partSuccess, setPartSuccess] = useState("");

  // Labor form
  const [laborTech, setLaborTech] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [laborDate, setLaborDate] = useState("");
  const [laborError, setLaborError] = useState("");
  const [laborSuccess, setLaborSuccess] = useState("");

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    setStatusError("");
    setStatusSuccess("");
    startTransition(async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrder.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus, notes: statusNotes }),
        });
        if (!res.ok) {
          const data = await res.json();
          setStatusError(data.error || "Failed to update status");
          return;
        }
        setStatusSuccess("Status updated successfully");
        setStatusNotes("");
        router.refresh();
      } catch {
        setStatusError("Network error. Please try again.");
      }
    });
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    setPartError("");
    setPartSuccess("");
    const qty = parseFloat(partQty);
    const cost = parseFloat(partUnitCost);
    if (!partName.trim()) {
      setPartError("Part name is required");
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setPartError("Quantity must be a positive number");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setPartError("Unit cost must be a non-negative number");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrder.id}/parts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: partName.trim(),
            quantity: qty,
            unit_cost: cost,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setPartError(data.error || "Failed to add part");
          return;
        }
        setPartSuccess("Part added successfully");
        setPartName("");
        setPartQty("");
        setPartUnitCost("");
        router.refresh();
      } catch {
        setPartError("Network error. Please try again.");
      }
    });
  }

  async function handleAddLabor(e: React.FormEvent) {
    e.preventDefault();
    setLaborError("");
    setLaborSuccess("");
    const hours = parseFloat(laborHours);
    const rate = parseFloat(laborRate);
    if (!laborTech.trim()) {
      setLaborError("Technician name is required");
      return;
    }
    if (isNaN(hours) || hours <= 0) {
      setLaborError("Hours must be a positive number");
      return;
    }
    if (isNaN(rate) || rate < 0) {
      setLaborError("Hourly rate must be a non-negative number");
      return;
    }
    if (!laborDate) {
      setLaborError("Work date is required");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrder.id}/labor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technician_name: laborTech.trim(),
            hours,
            hourly_rate: rate,
            work_date: laborDate,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setLaborError(data.error || "Failed to add labor entry");
          return;
        }
        setLaborSuccess("Labor entry added successfully");
        setLaborTech("");
        setLaborHours("");
        setLaborRate("");
        setLaborDate("");
        router.refresh();
      } catch {
        setLaborError("Network error. Please try again.");
      }
    });
  }

  const totalPartsCost = workOrder.parts.reduce(
    (sum, p) => sum + p.total_cost,
    0,
  );
  const totalLaborCost = workOrder.labor.reduce(
    (sum, l) => sum + l.total_cost,
    0,
  );
  const totalCost = totalPartsCost + totalLaborCost;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {workOrder.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Work Order #{workOrder.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[workOrder.status] || "bg-gray-100 text-gray-700"}`}
            >
              {workOrder.status.replace("_", " ")}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${PRIORITY_COLORS[workOrder.priority] || "bg-gray-100 text-gray-700"}`}
            >
              {workOrder.priority} priority
            </span>
          </div>
        </div>

        {workOrder.description && (
          <p className="mt-4 text-gray-700 leading-relaxed">
            {workOrder.description}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workOrder.asset_name && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Asset
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {workOrder.asset_name}
              </dd>
            </div>
          )}
          {workOrder.location && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Location
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {workOrder.location}
              </dd>
            </div>
          )}
          {workOrder.requestor_email && (
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Requestor
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {workOrder.requestor_email}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Created
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(workOrder.created_at)}
            </dd>
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Parts Cost</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(totalPartsCost)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Labor Cost</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(totalLaborCost)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Cost</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">
            {formatCurrency(totalCost)}
          </p>
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Update Status
        </h2>
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="status-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                New Status
              </label>
              <select
                id="status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                htmlFor="status-notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes (optional)
              </label>
              <input
                id="status-notes"
                type="text"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Reason for status change..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          {statusError && <p className="text-sm text-red-600">{statusError}</p>}
          {statusSuccess && (
            <p className="text-sm text-green-600">{statusSuccess}</p>
          )}
          <button
            type="submit"
            disabled={isPending || selectedStatus === workOrder.status}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Updating..." : "Update Status"}
          </button>
        </form>
      </div>

      {/* Status Timeline */}
      {workOrder.history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Status Timeline
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <ul className="space-y-4">
              {workOrder.history.map((entry, idx) => (
                <li key={entry.id} className="relative pl-10">
                  <div
                    className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${idx === 0 ? "bg-indigo-500" : "bg-gray-400"}`}
                  />
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {entry.old_status && (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[entry.old_status] || "bg-gray-100 text-gray-700"}`}
                          >
                            {entry.old_status.replace("_", " ")}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[entry.new_status] || "bg-gray-100 text-gray-700"}`}
                      >
                        {entry.new_status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                      <span>{formatDate(entry.changed_at)}</span>
                      {entry.changed_by && <span>by {entry.changed_by}</span>}
                    </div>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-gray-700">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Parts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Parts Used</h2>

        {workOrder.parts.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Part Name
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Unit Cost
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workOrder.parts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {part.name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {part.quantity}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {formatCurrency(part.unit_cost)}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(part.total_cost)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 text-right"
                  >
                    Total Parts
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(totalPartsCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">No parts added yet.</p>
        )}

        <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Part</h3>
        <form onSubmit={handleAddPart} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Part Name *
              </label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. Filter, Belt, Bearing"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={partQty}
                onChange={(e) => setPartQty(e.target.value)}
                placeholder="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Unit Cost ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={partUnitCost}
                onChange={(e) => setPartUnitCost(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          {partError && <p className="text-sm text-red-600">{partError}</p>}
          {partSuccess && (
            <p className="text-sm text-green-600">{partSuccess}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Adding..." : "Add Part"}
          </button>
        </form>
      </div>

      {/* Labor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Labor Entries
        </h2>

        {workOrder.labor.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Technician
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hours
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Rate/hr
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workOrder.labor.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {entry.technician_name}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {new Date(entry.work_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {entry.hours}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700 text-right">
                      {formatCurrency(entry.hourly_rate)}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(entry.total_cost)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 text-right"
                  >
                    Total Labor
                  </td>
                  <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(totalLaborCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            No labor entries added yet.
          </p>
        )}

        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Add Labor Entry
        </h3>
        <form onSubmit={handleAddLabor} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Technician *
              </label>
              <input
                type="text"
                value={laborTech}
                onChange={(e) => setLaborTech(e.target.value)}
                placeholder="Name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Hours *
              </label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={laborHours}
                onChange={(e) => setLaborHours(e.target.value)}
                placeholder="2.5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Hourly Rate ($) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                placeholder="75.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Work Date *
              </label>
              <input
                type="date"
                value={laborDate}
                onChange={(e) => setLaborDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          {laborError && <p className="text-sm text-red-600">{laborError}</p>}
          {laborSuccess && (
            <p className="text-sm text-green-600">{laborSuccess}</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Adding..." : "Add Labor Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
