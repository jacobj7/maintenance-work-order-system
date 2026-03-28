import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface WorkOrderSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  facility_name: string;
  location_name: string;
  assigned_to_name: string | null;
}

interface FacilitySummary {
  id: string;
  name: string;
  work_order_count: number;
}

interface StatusCount {
  status: string;
  count: string;
}

interface PriorityCount {
  priority: string;
  count: string;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view the dashboard.</p>
      </div>
    );
  }

  const userRole = (session.user as any).role as string;
  const userEmail = session.user.email as string;

  let userId: string | null = null;
  const userResult = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [userEmail],
  );
  if (userResult.rows.length > 0) {
    userId = userResult.rows[0].id;
  }

  let recentWorkOrders: WorkOrderSummary[] = [];
  let statusCounts: StatusCount[] = [];
  let priorityCounts: PriorityCount[] = [];
  let facilitySummaries: FacilitySummary[] = [];
  let totalWorkOrders = 0;
  let openWorkOrders = 0;

  if (userRole === "admin" || userRole === "manager") {
    const recentResult = await query<WorkOrderSummary>(
      `SELECT
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        wo.created_at,
        f.name AS facility_name,
        l.name AS location_name,
        u.name AS assigned_to_name
      FROM work_orders wo
      LEFT JOIN facilities f ON wo.facility_id = f.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      ORDER BY wo.created_at DESC
      LIMIT 10`,
      [],
    );
    recentWorkOrders = recentResult.rows;

    const statusResult = await query<StatusCount>(
      `SELECT status, COUNT(*) as count FROM work_orders GROUP BY status`,
      [],
    );
    statusCounts = statusResult.rows;

    const priorityResult = await query<PriorityCount>(
      `SELECT priority, COUNT(*) as count FROM work_orders GROUP BY priority`,
      [],
    );
    priorityCounts = priorityResult.rows;

    const facilityResult = await query<FacilitySummary>(
      `SELECT
        f.id,
        f.name,
        COUNT(wo.id) as work_order_count
      FROM facilities f
      LEFT JOIN work_orders wo ON wo.facility_id = f.id
      GROUP BY f.id, f.name
      ORDER BY work_order_count DESC
      LIMIT 5`,
      [],
    );
    facilitySummaries = facilityResult.rows;

    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders`,
      [],
    );
    totalWorkOrders = parseInt(totalResult.rows[0]?.count ?? "0", 10);

    const openResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders WHERE status NOT IN ('completed', 'cancelled')`,
      [],
    );
    openWorkOrders = parseInt(openResult.rows[0]?.count ?? "0", 10);
  } else if (userRole === "technician" && userId) {
    const recentResult = await query<WorkOrderSummary>(
      `SELECT
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        wo.created_at,
        f.name AS facility_name,
        l.name AS location_name,
        u.name AS assigned_to_name
      FROM work_orders wo
      LEFT JOIN facilities f ON wo.facility_id = f.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      WHERE wo.assigned_to = $1
      ORDER BY wo.created_at DESC
      LIMIT 10`,
      [userId],
    );
    recentWorkOrders = recentResult.rows;

    const statusResult = await query<StatusCount>(
      `SELECT status, COUNT(*) as count FROM work_orders WHERE assigned_to = $1 GROUP BY status`,
      [userId],
    );
    statusCounts = statusResult.rows;

    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders WHERE assigned_to = $1`,
      [userId],
    );
    totalWorkOrders = parseInt(totalResult.rows[0]?.count ?? "0", 10);

    const openResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders WHERE assigned_to = $1 AND status NOT IN ('completed', 'cancelled')`,
      [userId],
    );
    openWorkOrders = parseInt(openResult.rows[0]?.count ?? "0", 10);
  } else if (userId) {
    const recentResult = await query<WorkOrderSummary>(
      `SELECT
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        wo.created_at,
        f.name AS facility_name,
        l.name AS location_name,
        u.name AS assigned_to_name
      FROM work_orders wo
      LEFT JOIN facilities f ON wo.facility_id = f.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      WHERE wo.requested_by = $1
      ORDER BY wo.created_at DESC
      LIMIT 10`,
      [userId],
    );
    recentWorkOrders = recentResult.rows;

    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders WHERE requested_by = $1`,
      [userId],
    );
    totalWorkOrders = parseInt(totalResult.rows[0]?.count ?? "0", 10);

    const openResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM work_orders WHERE requested_by = $1 AND status NOT IN ('completed', 'cancelled')`,
      [userId],
    );
    openWorkOrders = parseInt(openResult.rows[0]?.count ?? "0", 10);
  }

  const statusColorMap: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    on_hold: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const priorityColorMap: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Work Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalWorkOrders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Open Work Orders
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {openWorkOrders}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {(userRole === "admin" || userRole === "manager") && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Facilities
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {facilitySummaries.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completion Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {totalWorkOrders > 0
                            ? `${Math.round(
                                ((statusCounts.find(
                                  (s) => s.status === "completed",
                                )
                                  ? parseInt(
                                      statusCounts.find(
                                        (s) => s.status === "completed",
                                      )!.count,
                                      10,
                                    )
                                  : 0) /
                                  totalWorkOrders) *
                                  100,
                              )}%`
                            : "N/A"}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent Work Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Work Orders
                </h2>
                <Link
                  href="/dashboard/work-orders"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
              <div className="border-t border-gray-200">
                {recentWorkOrders.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No work orders found.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {recentWorkOrders.map((wo) => (
                      <li key={wo.id}>
                        <Link
                          href={`/dashboard/work-orders/${wo.id}`}
                          className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {wo.title}
                            </p>
                            <div className="ml-2 flex-shrink-0 flex gap-2">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  statusColorMap[wo.status] ??
                                  "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {wo.status.replace("_", " ")}
                              </span>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  priorityColorMap[wo.priority] ??
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {wo.priority}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 sm:flex sm:justify-between">
                            <div className="sm:flex gap-4">
                              <p className="flex items-center text-sm text-gray-500">
                                {wo.facility_name}
                                {wo.location_name && ` — ${wo.location_name}`}
                              </p>
                              {wo.assigned_to_name && (
                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                  Assigned to: {wo.assigned_to_name}
                                </p>
                              )}
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                              {format(parseISO(wo.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Status Breakdown */}
            {statusCounts.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Status Breakdown
                  </h2>
                </div>
                <div className="border-t border-gray-200 px-4 py-4">
                  <ul className="space-y-3">
                    {statusCounts.map((sc) => (
                      <li
                        key={sc.status}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            statusColorMap[sc.status] ??
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {sc.status.replace("_", " ")}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {sc.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Priority Breakdown */}
            {priorityCounts.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Priority Breakdown
                  </h2>
                </div>
                <div className="border-t border-gray-200 px-4 py-4">
                  <ul className="space-y-3">
                    {priorityCounts.map((pc) => (
                      <li
                        key={pc.priority}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            priorityColorMap[pc.priority] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {pc.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {pc.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Top Facilities */}
            {facilitySummaries.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h2 className="text-lg font-medium text-gray-900">
                    Top Facilities
                  </h2>
                </div>
                <div className="border-t border-gray-200 px-4 py-4">
                  <ul className="space-y-3">
                    {facilitySummaries.map((f) => (
                      <li
                        key={f.id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700 truncate">
                          {f.name}
                        </span>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {f.work_order_count} orders
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h2>
              </div>
              <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                <Link
                  href="/dashboard/work-orders/new"
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  New Work Order
                </Link>
                {(userRole === "admin" || userRole === "manager") && (
                  <>
                    <Link
                      href="/dashboard/facilities"
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Manage Facilities
                    </Link>
                    <Link
                      href="/dashboard/users"
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Manage Users
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
