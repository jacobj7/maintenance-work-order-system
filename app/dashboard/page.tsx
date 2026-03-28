import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

interface WorkOrder {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface WorkOrdersByStatus {
  [status: string]: WorkOrder[];
}

interface SerializedWorkOrder {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let workOrders: WorkOrder[] = [];

  try {
    const result = await query(
      `SELECT 
        id,
        title,
        status,
        priority,
        due_date,
        assigned_to,
        created_at
      FROM work_orders
      ORDER BY created_at DESC`,
      [],
    );
    workOrders = result.rows as WorkOrder[];
  } catch (error) {
    console.error("Failed to fetch work orders:", error);
    workOrders = [];
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdueCount = workOrders.filter((wo) => {
    if (!wo.due_date) return false;
    if (wo.status === "completed" || wo.status === "cancelled") return false;
    const dueDate = new Date(wo.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < now;
  }).length;

  const workOrdersByStatus: WorkOrdersByStatus = workOrders.reduce(
    (acc: WorkOrdersByStatus, wo: WorkOrder) => {
      const status = wo.status || "unknown";
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(wo);
      return acc;
    },
    {},
  );

  const serializedWorkOrdersByStatus: {
    [status: string]: SerializedWorkOrder[];
  } = {};

  for (const [status, orders] of Object.entries(workOrdersByStatus)) {
    serializedWorkOrdersByStatus[status] = orders.map((wo) => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      priority: wo.priority,
      due_date: wo.due_date ? new Date(wo.due_date).toISOString() : null,
      assigned_to: wo.assigned_to,
      created_at: new Date(wo.created_at).toISOString(),
    }));
  }

  const totalCount = workOrders.length;

  const statusCounts: { [status: string]: number } = {};
  for (const [status, orders] of Object.entries(workOrdersByStatus)) {
    statusCounts[status] = orders.length;
  }

  return (
    <DashboardClient
      workOrdersByStatus={serializedWorkOrdersByStatus}
      overdueCount={overdueCount}
      totalCount={totalCount}
      statusCounts={statusCounts}
      userEmail={session.user?.email ?? null}
      userName={session.user?.name ?? null}
    />
  );
}
