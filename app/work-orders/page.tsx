import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import WorkOrdersClient from "./WorkOrdersClient";

export default async function WorkOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const result = await db.query(
    `SELECT 
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.created_at,
      wo.updated_at,
      wo.assigned_to,
      wo.created_by,
      u.name AS assigned_to_name,
      c.name AS created_by_name
    FROM work_orders wo
    LEFT JOIN users u ON wo.assigned_to = u.id
    LEFT JOIN users c ON wo.created_by = c.id
    ORDER BY wo.created_at DESC`,
    [],
  );

  const workOrders = result.rows.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as string,
    priority: row.priority as string,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    assignedTo: row.assigned_to as string | null,
    assignedToName: row.assigned_to_name as string | null,
    createdBy: row.created_by as string | null,
    createdByName: row.created_by_name as string | null,
  }));

  return <WorkOrdersClient workOrders={workOrders} />;
}
