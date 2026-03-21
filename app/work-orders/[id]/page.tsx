import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Navbar from "@/components/Navbar";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

interface PageProps {
  params: { id: string };
}

async function getWorkOrder(id: string) {
  const result = await db.query(
    `SELECT 
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.created_at,
      wo.updated_at,
      wo.due_date,
      wo.completed_at,
      wo.notes,
      wo.location,
      wo.asset_id,
      wo.created_by,
      wo.assigned_to,
      u_creator.name AS creator_name,
      u_creator.email AS creator_email,
      u_assignee.name AS assignee_name,
      u_assignee.email AS assignee_email,
      a.name AS asset_name,
      a.serial_number AS asset_serial_number
    FROM work_orders wo
    LEFT JOIN users u_creator ON wo.created_by = u_creator.id
    LEFT JOIN users u_assignee ON wo.assigned_to = u_assignee.id
    LEFT JOIN assets a ON wo.asset_id = a.id
    WHERE wo.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at ? (row.created_at as Date).toISOString() : null,
    updatedAt: row.updated_at ? (row.updated_at as Date).toISOString() : null,
    dueDate: row.due_date ? (row.due_date as Date).toISOString() : null,
    completedAt: row.completed_at
      ? (row.completed_at as Date).toISOString()
      : null,
    notes: row.notes ?? null,
    location: row.location ?? null,
    assetId: row.asset_id ?? null,
    createdBy: row.created_by ?? null,
    assignedTo: row.assigned_to ?? null,
    creatorName: row.creator_name ?? null,
    creatorEmail: row.creator_email ?? null,
    assigneeName: row.assignee_name ?? null,
    assigneeEmail: row.assignee_email ?? null,
    assetName: row.asset_name ?? null,
    assetSerialNumber: row.asset_serial_number ?? null,
  };
}

async function getTechnicians() {
  const result = await db.query(
    `SELECT id, name, email, role
     FROM users
     WHERE role IN ('technician', 'admin', 'manager')
     ORDER BY name ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  }));
}

async function getWorkOrderComments(workOrderId: string) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.content,
      c.created_at,
      c.user_id,
      u.name AS user_name,
      u.email AS user_email
    FROM work_order_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.work_order_id = $1
    ORDER BY c.created_at ASC`,
    [workOrderId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at ? (row.created_at as Date).toISOString() : null,
    userId: row.user_id,
    userName: row.user_name ?? null,
    userEmail: row.user_email ?? null,
  }));
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const { id } = params;

  const [workOrder, technicians, comments] = await Promise.all([
    getWorkOrder(id),
    getTechnicians(),
    getWorkOrderComments(id),
  ]);

  if (!workOrder) {
    notFound();
  }

  const currentUser = {
    id: session.user?.id ?? null,
    name: session.user?.name ?? null,
    email: session.user?.email ?? null,
    role: (session.user as { role?: string })?.role ?? null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkOrderDetailClient
          workOrder={workOrder}
          technicians={technicians}
          comments={comments}
          currentUser={currentUser}
        />
      </main>
    </div>
  );
}
