"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";

interface WorkOrder {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  location_name: string;
  asset_name: string;
  requester_name: string;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  completed: number;
  high_priority: number;
}

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "On Hold": "bg-gray-100 text-gray-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-orange-100 text-orange-700",
  High: "bg-red-100 text-red-700",
  Critical: "bg-red-200 text-red-900 font-bold",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colorClass = PRIORITY_COLORS[priority] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {priority}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    high_priority: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (priorityFilter !== "all") params.set("priority", priorityFilter);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/work-orders?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch work orders: ${res.statusText}`);
        }
        const data = await res.json();

        const orders: WorkOrder[] = data.workOrders ?? data.data ?? [];
        const count: number = data.total ?? data.count ?? orders.length;

        setWorkOrders(orders);
        setTotalCount(count);

        const open = orders.filter((o) => o.status === "Open").length;
        const in_progress = orders.filter(
          (o) => o.status === "In Progress",
        ).length;
        const completed = orders.filter((o) => o.status === "Completed").length;
        const high_priority = orders.filter(
          (o) => o.priority === "High" || o.priority === "Critical",
        ).length;

        setStats({
          total: count,
          open,
          in_progress,
          completed,
          high_priority,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [statusFilter, priorityFilter, page]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {session?.user?.name && (
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {session.user.name}
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Work Orders"
            value={stats.total}
            color="text-gray-900"
          />
          <StatCard label="Open" value={stats.open} color="text-blue-600" />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            color="text-yellow-600"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            color="text-green-600"
          />
          <StatCard
            label="High / Critical"
            value={stats.high_priority}
            color="text-red-600"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label
              htmlFor="status-filter"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="priority-filter"
              className="block text-sm font-medium text-gray-700"
            >
              Priority
            </label>
            <select
              id="priority-filter"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="mt-1 block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex items-end">
            <a
              href="/work-orders/new"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              + New Work Order
            </a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-500">Loading...</span>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No work orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {workOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        (window.location.href = `/work-orders/${order.id}`)
                      }
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate font-medium">
                          {order.title}
                        </div>
                        {order.asset_name && (
                          <div className="truncate text-xs text-gray-400">
                            {order.asset_name}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <PriorityBadge priority={order.priority} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {order.location_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                        {order.assigned_to_name ?? (
                          <span className="italic text-gray-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {order.created_at
                          ? format(parseISO(order.created_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
