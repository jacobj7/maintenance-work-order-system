import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";

interface DashboardSummary {
  totalAssets: number;
  activeWorkOrders: number;
  pendingWorkOrders: number;
  completedWorkOrders: number;
  criticalAssets: number;
  recentWorkOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    asset_name: string | null;
  }>;
}

async function getDashboardSummary(
  userId: string,
  userRole: string,
): Promise<DashboardSummary> {
  const client = await pool.connect();
  try {
    const isAdmin = userRole === "admin" || userRole === "manager";

    const assetsResult = await client.query<{
      total: string;
      critical: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'critical') as critical
       FROM assets
       WHERE ($1 OR assigned_user_id = $2)`,
      [isAdmin, userId],
    );

    const workOrdersResult = await client.query<{
      status: string;
      count: string;
    }>(
      `SELECT status, COUNT(*) as count
       FROM work_orders
       WHERE ($1 OR assigned_user_id = $2)
       GROUP BY status`,
      [isAdmin, userId],
    );

    const recentWorkOrdersResult = await client.query<{
      id: string;
      title: string;
      status: string;
      priority: string;
      created_at: string;
      asset_name: string | null;
    }>(
      `SELECT
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        wo.created_at,
        a.name as asset_name
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       WHERE ($1 OR wo.assigned_user_id = $2)
       ORDER BY wo.created_at DESC
       LIMIT 5`,
      [isAdmin, userId],
    );

    const statusCounts: Record<string, number> = {};
    for (const row of workOrdersResult.rows) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    return {
      totalAssets: parseInt(assetsResult.rows[0]?.total ?? "0", 10),
      criticalAssets: parseInt(assetsResult.rows[0]?.critical ?? "0", 10),
      activeWorkOrders: statusCounts["in_progress"] ?? 0,
      pendingWorkOrders: statusCounts["pending"] ?? 0,
      completedWorkOrders: statusCounts["completed"] ?? 0,
      recentWorkOrders: recentWorkOrdersResult.rows,
    };
  } finally {
    client.release();
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    critical: "bg-red-100 text-red-800",
  };
  const color = colors[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };
  const color = colors[priority] ?? "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {priority}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const summary = await getDashboardSummary(session.user.id, session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session.user.name ?? session.user.email}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Assets
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary.totalAssets}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/dashboard/assets"
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
            >
              View all assets
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Critical Assets
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary.criticalAssets}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/dashboard/assets?status=critical"
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
            >
              View critical assets
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Work Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary.activeWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/dashboard/work-orders?status=in_progress"
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
            >
              View active orders
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Work Orders
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary.pendingWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <Link
              href="/dashboard/work-orders?status=pending"
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
            >
              View pending orders
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Recent Work Orders
          </h2>
          <Link
            href="/dashboard/work-orders"
            className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="border-t border-gray-200">
          {summary.recentWorkOrders.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No work orders found.{" "}
              <Link
                href="/dashboard/work-orders/new"
                className="text-indigo-600 hover:text-indigo-900"
              >
                Create one
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {summary.recentWorkOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/work-orders/${order.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {order.title}
                        </p>
                        {order.asset_name && (
                          <p className="text-sm text-gray-500 truncate">
                            Asset: {order.asset_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <PriorityBadge priority={order.priority} />
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-gray-400">
                        Created{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Work Order Summary
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Pending</dt>
              <dd className="text-sm font-medium text-gray-900">
                {summary.pendingWorkOrders}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">In Progress</dt>
              <dd className="text-sm font-medium text-gray-900">
                {summary.activeWorkOrders}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Completed</dt>
              <dd className="text-sm font-medium text-gray-900">
                {summary.completedWorkOrders}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-3">
              <dt className="text-sm font-medium text-gray-700">Total</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {summary.pendingWorkOrders +
                  summary.activeWorkOrders +
                  summary.completedWorkOrders}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/work-orders/new"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="h-5 w-5 text-indigo-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                Create Work Order
              </span>
            </Link>
            <Link
              href="/dashboard/assets/new"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="h-5 w-5 text-indigo-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                Add Asset
              </span>
            </Link>
            <Link
              href="/dashboard/reports"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <svg
                className="h-5 w-5 text-indigo-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                View Reports
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
