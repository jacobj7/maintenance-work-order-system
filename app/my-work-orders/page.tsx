import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";

export default async function MyWorkOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const userEmail = session.user.email;

  // Look up the user's UUID from their email
  const userRows = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [userEmail],
  );

  if (!userRows || userRows.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">My Work Orders</h1>
        <p className="text-gray-500">User account not found.</p>
      </div>
    );
  }

  const userUUID = userRows[0].id;

  const workOrders = await query<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    facility_name: string | null;
    location_name: string | null;
  }>(
    `SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.created_at,
      wo.updated_at,
      f.name AS facility_name,
      l.name AS location_name
    FROM work_orders wo
    LEFT JOIN facilities f ON wo.facility_id = f.id
    LEFT JOIN locations l ON wo.location_id = l.id
    WHERE wo.assigned_to = $1
    ORDER BY wo.created_at DESC`,
    [userUUID],
  );

  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
    on_hold: "bg-orange-100 text-orange-800",
  };

  const priorityColor: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Work Orders</h1>
        <Link
          href="/work-orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          New Work Order
        </Link>
      </div>

      {workOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">
            No work orders assigned to you.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Work orders assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  Facility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
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
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {wo.title}
                    </div>
                    {wo.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {wo.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColor[wo.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {wo.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        priorityColor[wo.priority] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {wo.facility_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {wo.location_name ?? "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {wo.created_at
                      ? format(parseISO(wo.created_at), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
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
