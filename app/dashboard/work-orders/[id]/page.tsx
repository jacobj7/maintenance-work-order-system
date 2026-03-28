import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PriorityBadge from "@/components/work-orders/PriorityBadge";
import StatusBadge from "@/components/work-orders/StatusBadge";
import StatusHistoryTimeline from "@/components/work-orders/StatusHistoryTimeline";
import StatusUpdateForm from "@/components/work-orders/StatusUpdateForm";
import { format, parseISO } from "date-fns";

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  location: string | null;
  notes: string | null;
}

interface StatusHistory {
  id: string;
  workOrderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  comment: string | null;
}

interface WorkOrderDetailResponse {
  workOrder: WorkOrder;
  statusHistory: StatusHistory[];
}

async function getWorkOrderDetail(
  id: string,
  sessionToken: string | undefined,
): Promise<WorkOrderDetailResponse | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/work-orders/${id}`, {
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken
          ? { Cookie: `next-auth.session-token=${sessionToken}` }
          : {}),
      },
      cache: "no-store",
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch work order: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching work order detail:", error);
    return null;
  }
}

function formatDateSafe(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  } catch {
    return "Invalid date";
  }
}

function formatDateOnlySafe(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return "Invalid date";
  }
}

interface PageProps {
  params: { id: string };
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Please sign in to view this page.</p>
      </div>
    );
  }

  const sessionToken = undefined;
  const data = await getWorkOrderDetail(params.id, sessionToken);

  if (!data) {
    notFound();
  }

  const { workOrder, statusHistory } = data;

  const serializedWorkOrder: WorkOrder = {
    ...workOrder,
    createdAt: workOrder.createdAt,
    updatedAt: workOrder.updatedAt,
    dueDate: workOrder.dueDate ?? null,
  };

  const serializedStatusHistory: StatusHistory[] = statusHistory.map(
    (entry) => ({
      ...entry,
      changedAt: entry.changedAt,
      comment: entry.comment ?? null,
      fromStatus: entry.fromStatus ?? null,
    }),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {workOrder.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Work Order #{workOrder.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PriorityBadge priority={workOrder.priority} />
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Description
            </h2>
            {workOrder.description ? (
              <p className="text-gray-700 whitespace-pre-wrap">
                {workOrder.description}
              </p>
            ) : (
              <p className="text-gray-400 italic">No description provided.</p>
            )}
          </div>

          {/* Notes */}
          {workOrder.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notes
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {workOrder.notes}
              </p>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Status History
            </h2>
            <StatusHistoryTimeline history={serializedStatusHistory} />
          </div>

          {/* Status Update Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Update Status
            </h2>
            <StatusUpdateForm
              workOrderId={workOrder.id}
              currentStatus={workOrder.status}
            />
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Details
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={workOrder.status} />
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1">
                  <PriorityBadge priority={workOrder.priority} />
                </dd>
              </div>

              {workOrder.location && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {workOrder.location}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Assigned To
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workOrder.assignedToName || "Unassigned"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Created By
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workOrder.createdByName}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateSafe(workOrder.createdAt)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateSafe(workOrder.updatedAt)}
                </dd>
              </div>

              {workOrder.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Due Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDateOnlySafe(workOrder.dueDate)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
