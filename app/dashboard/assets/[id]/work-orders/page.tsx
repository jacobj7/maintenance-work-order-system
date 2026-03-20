import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  assigned_to: string | null;
  technician_name: string | null;
}

interface PageProps {
  params: { id: string };
}

async function getWorkOrders(assetId: string): Promise<WorkOrder[]> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return [];
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/assets/${assetId}/work-orders`, {
    headers: {
      Cookie: `next-auth.session-token=${(session as any)?.sessionToken || ""}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch work orders: ${res.statusText}`);
  }

  const data = await res.json();
  return data.workOrders || data || [];
}

function StatusBadge({ status }: { status: WorkOrder["status"] }) {
  const styles: Record<WorkOrder["status"], string> = {
    open: "bg-blue-100 text-blue-800 border border-blue-200",
    in_progress: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    completed: "bg-green-100 text-green-800 border border-green-200",
    cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
  };

  const labels: Record<WorkOrder["status"], string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WorkOrder["priority"] }) {
  const styles: Record<WorkOrder["priority"], string> = {
    low: "bg-slate-100 text-slate-600 border border-slate-200",
    medium: "bg-orange-100 text-orange-700 border border-orange-200",
    high: "bg-red-100 text-red-700 border border-red-200",
    critical: "bg-red-600 text-white border border-red-700",
  };

  const labels: Record<WorkOrder["priority"], string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function WorkOrdersPage({ params }: PageProps) {
  const { id } = params;

  let workOrders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    workOrders = await getWorkOrders(id);
  } catch (err) {
    error = err instanceof Error ? err.message : "An unexpected error occurred";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link
              href="/dashboard"
              className="hover:text-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <span>/</span>
            <Link
              href="/dashboard/assets"
              className="hover:text-gray-700 transition-colors"
            >
              Assets
            </Link>
            <span>/</span>
            <Link
              href={`/dashboard/assets/${id}`}
              className="hover:text-gray-700 transition-colors"
            >
              Asset {id}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Work Orders</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Repair History
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                All work orders associated with this asset
              </p>
            </div>
            <Link
              href={`/dashboard/assets/${id}/work-orders/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg
                className="-ml-1 mr-2 h-4 w-4"
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
              New Work Order
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading work orders
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {!error && workOrders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {(
              [
                "open",
                "in_progress",
                "completed",
                "cancelled",
              ] as WorkOrder["status"][]
            ).map((status) => {
              const count = workOrders.filter(
                (wo) => wo.status === status,
              ).length;
              return (
                <div
                  key={status}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={status} />
                    <span className="text-2xl font-bold text-gray-900">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!error && workOrders.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No work orders found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              This asset has no repair history yet. Create a new work order to
              get started.
            </p>
            <div className="mt-6">
              <Link
                href={`/dashboard/assets/${id}/work-orders/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Create First Work Order
              </Link>
            </div>
          </div>
        )}

        {/* Work Orders List */}
        {!error && workOrders.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {workOrders.map((workOrder) => (
                <li key={workOrder.id}>
                  <Link
                    href={`/dashboard/assets/${id}/work-orders/${workOrder.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-6 py-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {workOrder.title}
                            </h3>
                            <StatusBadge status={workOrder.status} />
                            <PriorityBadge priority={workOrder.priority} />
                          </div>

                          {workOrder.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                              {workOrder.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Created {formatDate(workOrder.created_at)}
                            </span>

                            {workOrder.completed_at && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                Completed {formatDate(workOrder.completed_at)}
                              </span>
                            )}

                            {workOrder.technician_name && (
                              <span className="flex items-center gap-1">
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {workOrder.technician_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
