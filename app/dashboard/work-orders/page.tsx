import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  asset_id: string | null;
  asset_name: string | null;
  assigned_to: string | null;
  assigned_user_name: string | null;
  created_at: string;
  updated_at: string;
}

export default async function WorkOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let workOrders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query<WorkOrder>(`
        SELECT
          wo.id,
          wo.title,
          wo.description,
          wo.status,
          wo.priority,
          wo.asset_id,
          a.name AS asset_name,
          wo.assigned_to,
          u.name AS assigned_user_name,
          wo.created_at,
          wo.updated_at
        FROM work_orders wo
        LEFT JOIN assets a ON wo.asset_id = a.id
        LEFT JOIN users u ON wo.assigned_to = u.id
        ORDER BY wo.created_at DESC
      `);
      workOrders = result.rows;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to fetch work orders:", err);
    error = "Failed to load work orders. Please try again later.";
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "low":
        return "bg-gray-100 text-gray-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
        <Link
          href="/dashboard/work-orders/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Create Work Order
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {workOrders.length === 0 && !error ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No work orders found.</p>
          <p className="text-gray-400 mt-2">
            Create your first work order to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
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
              {workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {workOrder.title}
                    </div>
                    {workOrder.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {workOrder.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}
                    >
                      {workOrder.status?.replace("_", " ") ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(workOrder.priority)}`}
                    >
                      {workOrder.priority ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workOrder.asset_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workOrder.assigned_user_name ?? "Unassigned"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(workOrder.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/dashboard/work-orders/${workOrder.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/work-orders/${workOrder.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
