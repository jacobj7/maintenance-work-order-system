import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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
      wo.location,
      wo.notes,
      wo.created_by,
      wo.assigned_to,
      u_creator.name AS creator_name,
      u_creator.email AS creator_email,
      u_assignee.name AS assignee_name,
      u_assignee.email AS assignee_email
    FROM work_orders wo
    LEFT JOIN users u_creator ON wo.created_by = u_creator.id
    LEFT JOIN users u_assignee ON wo.assigned_to = u_assignee.id
    WHERE wo.id = $1`,
    [id],
  );

  return result.rows[0] || null;
}

async function getTechnicians() {
  const result = await db.query(
    `SELECT id, name, email, role
     FROM users
     WHERE role IN ('technician', 'admin')
     ORDER BY name ASC`,
  );
  return result.rows;
}

async function getWorkOrderComments(workOrderId: string) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.work_order_id,
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
  return result.rows;
}

function serializeWorkOrder(wo: Record<string, unknown>) {
  return {
    id: wo.id as string,
    title: wo.title as string,
    description: (wo.description as string) || null,
    status: wo.status as string,
    priority: wo.priority as string,
    created_at: wo.created_at ? (wo.created_at as Date).toISOString() : null,
    updated_at: wo.updated_at ? (wo.updated_at as Date).toISOString() : null,
    due_date: wo.due_date ? (wo.due_date as Date).toISOString() : null,
    completed_at: wo.completed_at
      ? (wo.completed_at as Date).toISOString()
      : null,
    location: (wo.location as string) || null,
    notes: (wo.notes as string) || null,
    created_by: (wo.created_by as string) || null,
    assigned_to: (wo.assigned_to as string) || null,
    creator_name: (wo.creator_name as string) || null,
    creator_email: (wo.creator_email as string) || null,
    assignee_name: (wo.assignee_name as string) || null,
    assignee_email: (wo.assignee_email as string) || null,
  };
}

function serializeTechnician(tech: Record<string, unknown>) {
  return {
    id: tech.id as string,
    name: (tech.name as string) || null,
    email: tech.email as string,
    role: tech.role as string,
  };
}

function serializeComment(comment: Record<string, unknown>) {
  return {
    id: comment.id as string,
    work_order_id: comment.work_order_id as string,
    content: comment.content as string,
    created_at: comment.created_at
      ? (comment.created_at as Date).toISOString()
      : null,
    user_id: (comment.user_id as string) || null,
    user_name: (comment.user_name as string) || null,
    user_email: (comment.user_email as string) || null,
  };
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

  const serializedWorkOrder = serializeWorkOrder(workOrder);
  const serializedTechnicians = technicians.map(serializeTechnician);
  const serializedComments = comments.map(serializeComment);

  return (
    <WorkOrderDetailClient
      workOrder={serializedWorkOrder}
      technicians={serializedTechnicians}
      comments={serializedComments}
      currentUserId={session.user?.id as string}
      currentUserRole={session.user?.role as string}
    />
  );
}
