import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
}

export default async function TechnicianPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const technicianId = session.user.id;

  if (!technicianId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-600">
            Your session is missing a valid user ID. Please sign out and sign
            back in to continue.
          </p>
          <Link
            href="/api/auth/signout"
            className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Sign Out
          </Link>
        </div>
      </div>
    );
  }

  let workOrders: WorkOrder[] = [];
  let fetchError: string | null = null;

  try {
    const result = await pool.query<WorkOrder>(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.updated_at,
        c.name AS customer_name,
        c.email AS customer_email
      FROM work_orders wo
      LEFT JOIN customers c ON wo.customer_id = c.id
      WHERE wo.assigned_to = $1
      ORDER BY wo.created_at DESC`,
      [technicianId],
    );
    workOrders = result.rows;
  } catch (error) {
    console.error("Failed to fetch work orders for technician:", error);
    fetchError = "Failed to load work orders. Please try again later.";
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
    urgent: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Work Orders</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {session.user.name || session.user.email}
          </p>
        </div>

        {fetchError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{fetchError}</p>
          </div>
        )}

        {!fetchError && workOrders.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">
              No work orders assigned to you at this time.
            </p>
          </div>
        )}

        {workOrders.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-2">
                      {order.title}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        priorityColors[order.priority] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.priority}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {order.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[order.status] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {(order.customer_name || order.customer_email) && (
                    <div className="border-t pt-4">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                        Customer
                      </p>
                      {order.customer_name && (
                        <p className="text-sm text-gray-700">
                          {order.customer_name}
                        </p>
                      )}
                      {order.customer_email && (
                        <p className="text-sm text-gray-500">
                          {order.customer_email}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <Link
                      href={`/work-orders/${order.id}`}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
