import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import WorkOrderDetailClient from "@/components/WorkOrderDetailClient";

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  location: string | null;
  notes: string | null;
  status_history: StatusHistoryEntry[];
}

interface StatusHistoryEntry {
  id: number;
  work_order_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number;
  changed_by_name: string | null;
  changed_at: string;
  notes: string | null;
}

async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  try {
    const workOrderResult = await query(
      `SELECT 
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.assigned_to,
        u_assigned.name AS assigned_to_name,
        wo.created_by,
        u_created.name AS created_by_name,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.location,
        wo.notes
      FROM work_orders wo
      LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON wo.created_by = u_created.id
      WHERE wo.id = $1`,
      [id],
    );

    if (!workOrderResult.rows || workOrderResult.rows.length === 0) {
      return null;
    }

    const workOrder = workOrderResult.rows[0];

    const historyResult = await query(
      `SELECT 
        sh.id,
        sh.work_order_id,
        sh.old_status,
        sh.new_status,
        sh.changed_by,
        u.name AS changed_by_name,
        sh.changed_at,
        sh.notes
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at DESC`,
      [workOrder.id],
    );

    const statusHistory: StatusHistoryEntry[] = (historyResult.rows || []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as number,
        work_order_id: row.work_order_id as number,
        old_status: row.old_status as string | null,
        new_status: row.new_status as string,
        changed_by: row.changed_by as number,
        changed_by_name: row.changed_by_name as string | null,
        changed_at:
          row.changed_at instanceof Date
            ? (row.changed_at as Date).toISOString()
            : String(row.changed_at),
        notes: row.notes as string | null,
      }),
    );

    return {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      priority: workOrder.priority,
      assigned_to: workOrder.assigned_to,
      assigned_to_name: workOrder.assigned_to_name,
      created_by: workOrder.created_by,
      created_by_name: workOrder.created_by_name,
      created_at:
        workOrder.created_at instanceof Date
          ? workOrder.created_at.toISOString()
          : String(workOrder.created_at),
      updated_at:
        workOrder.updated_at instanceof Date
          ? workOrder.updated_at.toISOString()
          : String(workOrder.updated_at),
      due_date:
        workOrder.due_date instanceof Date
          ? workOrder.due_date.toISOString()
          : workOrder.due_date
            ? String(workOrder.due_date)
            : null,
      location: workOrder.location,
      notes: workOrder.notes,
      status_history: statusHistory,
    };
  } catch (error) {
    console.error("Error fetching work order:", error);
    return null;
  }
}

interface PageProps {
  params: { id: string };
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const workOrder = await getWorkOrder(params.id);

  if (!workOrder) {
    notFound();
  }

  const serializedWorkOrder = JSON.parse(JSON.stringify(workOrder));

  return (
    <WorkOrderDetailClient
      workOrder={serializedWorkOrder}
      currentUserId={session.user?.id as string | undefined}
    />
  );
}
