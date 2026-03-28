import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface WorkOrderDetail {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  location: string;
  assigned_to_name: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
}

interface StatusHistory {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_by_name: string;
  changed_at: string;
  comment: string | null;
}

async function getWorkOrderDetail(
  id: string,
  userId: number,
  userRole: string,
): Promise<WorkOrderDetail | null> {
  try {
    let result;
    if (userRole === "admin" || userRole === "manager") {
      result = await query(
        `SELECT
          wo.id,
          wo.title,
          wo.description,
          wo.status,
          wo.priority,
          wo.location,
          wo.notes,
          wo.due_date,
          wo.completed_at,
          wo.created_at,
          wo.updated_at,
          assigned.name AS assigned_to_name,
          creator.name AS created_by_name
        FROM work_orders wo
        LEFT JOIN users assigned ON wo.assigned_to = assigned.id
        JOIN users creator ON wo.created_by = creator.id
        WHERE wo.id = $1`,
        [id],
      );
    } else {
      result = await query(
        `SELECT
          wo.id,
          wo.title,
          wo.description,
          wo.status,
          wo.priority,
          wo.location,
          wo.notes,
          wo.due_date,
          wo.completed_at,
          wo.created_at,
          wo.updated_at,
          assigned.name AS assigned_to_name,
          creator.name AS created_by_name
        FROM work_orders wo
        LEFT JOIN users assigned ON wo.assigned_to = assigned.id
        JOIN users creator ON wo.created_by = creator.id
        WHERE wo.id = $1
          AND (wo.created_by = $2 OR wo.assigned_to = $2)`,
        [id, userId],
      );
    }

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as WorkOrderDetail;
  } catch (error) {
    console.error("Error fetching work order detail:", error);
    return null;
  }
}

async function getStatusHistory(workOrderId: string): Promise<StatusHistory[]> {
  try {
    const result = await query(
      `SELECT
        wsh.id,
        wsh.old_status,
        wsh.new_status,
        wsh.changed_at,
        wsh.comment,
        u.name AS changed_by_name
      FROM work_order_status_history wsh
      JOIN users u ON wsh.changed_by = u.id
      WHERE wsh.work_order_id = $1
      ORDER BY wsh.changed_at DESC`,
      [workOrderId],
    );

    return (result.rows || []) as StatusHistory[];
  } catch (error) {
    console.error("Error fetching status history:", error);
    return [];
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "on_hold":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "critical":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatDateSafe(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return "Invalid date";
  }
}

function formatDateOnlySafe(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = Number((session.user as { id?: string | number }).id);
  const userRole = (session.user as { role?: string }).role ?? "technician";

  if (!userId || isNaN(userId)) {
    redirect("/login");
  }

  const workOrder = await getWorkOrderDetail(params.id, userId, userRole);

  if (!workOrder) {
    notFound();
  }

  const statusHistory = await getStatusHistory(params.id);

  const canEdit =
    userRole === "admin" ||
    userRole === "manager" ||
    workOrder.assigned_to_name === session.user.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Work Order #{workOrder.id}
            </h1>
          </div>
          {canEdit && (
            <Link
              href={`/dashboard/work-orders/${workOrder.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Edit Work Order
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {workOrder.title}
              </h2>
              <div className="flex gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                    workOrder.status,
                  )}`}
                >
                  {workOrder.status.replace("_", " ")}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(
                    workOrder.priority,
                  )}`}
                >
                  {workOrder.priority} priority
                </span>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">
                {workOrder.description || "No description provided."}
              </p>
            </div>

            {/* Notes */}
            {workOrder.notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Notes
                </h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {workOrder.notes}
                </p>
              </div>
            )}

            {/* Status History */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Status History
              </h3>
              {statusHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No status changes recorded.
                </p>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {statusHistory.map((entry, index) => (
                      <li key={entry.id}>
                        <div className="relative pb-8">
                          {index < statusHistory.length - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                                <svg
                                  className="h-4 w-4 text-indigo-600"
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
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {entry.old_status ? (
                                    <>
                                      Status changed from{" "}
                                      <span className="font-medium">
                                        {entry.old_status.replace("_", " ")}
                                      </span>{" "}
                                      to{" "}
                                      <span className="font-medium">
                                        {entry.new_status.replace("_", " ")}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      Work order created with status{" "}
                                      <span className="font-medium">
                                        {entry.new_status.replace("_", " ")}
                                      </span>
                                    </>
                                  )}{" "}
                                  by{" "}
                                  <span className="font-medium">
                                    {entry.changed_by_name}
                                  </span>
                                </p>
                                {entry.comment && (
                                  <p className="mt-1 text-sm text-gray-500 italic">
                                    &ldquo;{entry.comment}&rdquo;
                                  </p>
                                )}
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {formatDateSafe(entry.changed_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {workOrder.location || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Assigned To
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {workOrder.assigned_to_name || "Unassigned"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Created By
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {workOrder.created_by_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Created At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateSafe(workOrder.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Last Updated
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateSafe(workOrder.updated_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Due Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateOnlySafe(workOrder.due_date)}
                  </dd>
                </div>
                {workOrder.completed_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Completed At
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDateSafe(workOrder.completed_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Actions */}
            {canEdit && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/work-orders/${workOrder.id}/edit`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Edit Details
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
