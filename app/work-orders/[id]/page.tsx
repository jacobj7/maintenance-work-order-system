import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

interface WorkOrderDetailPageProps {
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

async function getWorkOrderComments(workOrderId: string) {
  const result = await db.query(
    `SELECT 
      c.id,
      c.work_order_id,
      c.content,
      c.created_at,
      c.updated_at,
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

async function getTechnicians() {
  const result = await db.query(
    `SELECT 
      id,
      name,
      email,
      role
    FROM users
    WHERE role IN ('technician', 'admin')
    ORDER BY name ASC`,
  );

  return result.rows;
}

function serializeWorkOrder(workOrder: Record<string, unknown>) {
  return {
    id: workOrder.id as string,
    title: workOrder.title as string,
    description: workOrder.description as string | null,
    status: workOrder.status as string,
    priority: workOrder.priority as string,
    created_at: workOrder.created_at
      ? (workOrder.created_at as Date).toISOString()
      : null,
    updated_at: workOrder.updated_at
      ? (workOrder.updated_at as Date).toISOString()
      : null,
    due_date: workOrder.due_date
      ? (workOrder.due_date as Date).toISOString()
      : null,
    completed_at: workOrder.completed_at
      ? (workOrder.completed_at as Date).toISOString()
      : null,
    location: workOrder.location as string | null,
    notes: workOrder.notes as string | null,
    created_by: workOrder.created_by as string | null,
    assigned_to: workOrder.assigned_to as string | null,
    creator_name: workOrder.creator_name as string | null,
    creator_email: workOrder.creator_email as string | null,
    assignee_name: workOrder.assignee_name as string | null,
    assignee_email: workOrder.assignee_email as string | null,
  };
}

function serializeComments(comments: Record<string, unknown>[]) {
  return comments.map((comment) => ({
    id: comment.id as string,
    work_order_id: comment.work_order_id as string,
    content: comment.content as string,
    created_at: comment.created_at
      ? (comment.created_at as Date).toISOString()
      : null,
    updated_at: comment.updated_at
      ? (comment.updated_at as Date).toISOString()
      : null,
    user_id: comment.user_id as string | null,
    user_name: comment.user_name as string | null,
    user_email: comment.user_email as string | null,
  }));
}

function serializeTechnicians(technicians: Record<string, unknown>[]) {
  return technicians.map((tech) => ({
    id: tech.id as string,
    name: tech.name as string,
    email: tech.email as string,
    role: tech.role as string,
  }));
}

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const workOrderId = params.id;

  const [workOrder, comments, technicians] = await Promise.all([
    getWorkOrder(workOrderId),
    getWorkOrderComments(workOrderId),
    getTechnicians(),
  ]);

  if (!workOrder) {
    notFound();
  }

  const serializedWorkOrder = serializeWorkOrder(workOrder);
  const serializedComments = serializeComments(comments);
  const serializedTechnicians = serializeTechnicians(technicians);

  return (
    <WorkOrderDetailClient
      workOrder={serializedWorkOrder}
      comments={serializedComments}
      technicians={serializedTechnicians}
      currentUserId={session.user?.id as string}
      currentUserRole={session.user?.role as string}
    />
  );
}
