import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

interface WorkOrder {
  id: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_to_name: string | null;
  location: string | null;
}

interface SummaryData {
  open_count: number;
  in_progress_count: number;
  completed_count: number;
  high_priority_count: number;
}

async function getSummaryData(
  userId: string,
  role: string,
): Promise<SummaryData> {
  const isAdmin = role === "admin" || role === "manager";

  const openResult = await query(
    isAdmin
      ? `SELECT COUNT(*) AS open_count FROM work_orders WHERE status NOT IN ('completed', 'cancelled')`
      : `SELECT COUNT(*) AS open_count FROM work_orders WHERE status NOT IN ('completed', 'cancelled') AND user_id = $1`,
    isAdmin ? [] : [userId],
  );

  const inProgressResult = await query(
    isAdmin
      ? `SELECT COUNT(*) AS in_progress_count FROM work_orders WHERE status = 'in_progress'`
      : `SELECT COUNT(*) AS in_progress_count FROM work_orders WHERE status = 'in_progress' AND user_id = $1`,
    isAdmin ? [] : [userId],
  );

  const completedResult = await query(
    isAdmin
      ? `SELECT COUNT(*) AS completed_count FROM work_orders WHERE status = 'completed'`
      : `SELECT COUNT(*) AS completed_count FROM work_orders WHERE status = 'completed' AND user_id = $1`,
    isAdmin ? [] : [userId],
  );

  const highPriorityResult = await query(
    isAdmin
      ? `SELECT COUNT(*) AS high_priority_count FROM work_orders WHERE priority = 'high' AND status NOT IN ('completed', 'cancelled')`
      : `SELECT COUNT(*) AS high_priority_count FROM work_orders WHERE priority = 'high' AND status NOT IN ('completed', 'cancelled') AND user_id = $1`,
    isAdmin ? [] : [userId],
  );

  return {
    open_count: parseInt(openResult.rows[0]?.open_count ?? "0", 10),
    in_progress_count: parseInt(
      inProgressResult.rows[0]?.in_progress_count ?? "0",
      10,
    ),
    completed_count: parseInt(
      completedResult.rows[0]?.completed_count ?? "0",
      10,
    ),
    high_priority_count: parseInt(
      highPriorityResult.rows[0]?.high_priority_count ?? "0",
      10,
    ),
  };
}

async function getWorkOrders(
  userId: string,
  role: string,
): Promise<WorkOrder[]> {
  const isAdmin = role === "admin" || role === "manager";

  const result = await query(
    isAdmin
      ? `SELECT
           wo.id,
           wo.title,
           wo.status,
           wo.priority,
           wo.created_at,
           wo.location,
           u.name AS assigned_to_name
         FROM work_orders wo
         LEFT JOIN users u ON wo.assigned_to = u.id
         ORDER BY wo.created_at DESC
         LIMIT 20`
      : `SELECT
           wo.id,
           wo.title,
           wo.status,
           wo.priority,
           wo.created_at,
           wo.location,
           u.name AS assigned_to_name
         FROM work_orders wo
         LEFT JOIN users u ON wo.assigned_to = u.id
         WHERE wo.user_id = $1
         ORDER BY wo.created_at DESC
         LIMIT 20`,
    isAdmin ? [] : [userId],
  );

  return result.rows;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-orange-100 text-orange-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: string }).role ?? "technician";

  const [summary, workOrders] = await Promise.all([
    getSummaryData(userId, role),
    getWorkOrders(userId, role),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {session.user.name}
            </p>
          </div>
          <Link
            href="/work-orders/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            New Work Order
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">O</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Open
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summary.open_count}
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
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      In Progress
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summary.in_progress_count}
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
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">C</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summary.completed_count}
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
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">H</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      High Priority
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summary.high_priority_count}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Work Orders
            </h2>
          </div>
          <div className="overflow-x-auto">
            {workOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No work orders found.</p>
                <Link
                  href="/work-orders/new"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                >
                  Create your first work order
                </Link>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Assigned To
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}
                        >
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.assigned_to_name ?? "Unassigned"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.location ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/work-orders/${order.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
