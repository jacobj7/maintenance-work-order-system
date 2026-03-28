import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import MyWorkOrdersClient from "@/components/MyWorkOrdersClient";

export interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  location: string | null;
  notes: string | null;
}

export default async function MyWorkOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const userEmail = session.user.email;

  const result = await query(
    `SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.assigned_to,
      wo.created_by,
      wo.created_at,
      wo.updated_at,
      wo.due_date,
      wo.location,
      wo.notes
    FROM work_orders wo
    WHERE wo.assigned_to = $1
    ORDER BY wo.created_at DESC`,
    [userEmail],
  );

  const workOrders: WorkOrder[] = (result.rows || []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as number,
      title: row.title as string,
      description: row.description as string | null,
      status: row.status as string,
      priority: row.priority as string,
      assigned_to: row.assigned_to as string | null,
      created_by: row.created_by as string | null,
      created_at:
        row.created_at instanceof Date
          ? (row.created_at as Date).toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? (row.updated_at as Date).toISOString()
          : String(row.updated_at),
      due_date: row.due_date
        ? row.due_date instanceof Date
          ? (row.due_date as Date).toISOString()
          : String(row.due_date)
        : null,
      location: row.location as string | null,
      notes: row.notes as string | null,
    }),
  );

  return <MyWorkOrdersClient workOrders={workOrders} userEmail={userEmail} />;
}
