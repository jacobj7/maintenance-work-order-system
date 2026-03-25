import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

interface WorkOrderDetailPageProps {
  params: { id: string };
}

async function getWorkOrder(id: string, userId: string) {
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
      wo.assigned_to,
      wo.created_by,
      wo.location,
      wo.notes,
      u_assigned.name AS assigned_to_name,
      u_assigned.email AS assigned_to_email,
      u_created.name AS created_by_name,
      u_created.email AS created_by_email
    FROM work_orders wo
    LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
    LEFT JOIN users u_created ON wo.created_by = u_created.id
    WHERE wo.id = $1`,
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function getWorkOrderComments(workOrderId: string) {
  const result = await db.query(
    `SELECT 
      c.id,
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

async function getWorkOrderAttachments(workOrderId: string) {
  const result = await db.query(
    `SELECT 
      a.id,
      a.file_name,
      a.file_url,
      a.file_size,
      a.mime_type,
      a.created_at,
      a.uploaded_by,
      u.name AS uploaded_by_name
    FROM work_order_attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.work_order_id = $1
    ORDER BY a.created_at DESC`,
    [workOrderId],
  );

  return result.rows;
}

function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  const workOrder = await getWorkOrder(params.id, session.user.id as string);

  if (!workOrder) {
    notFound();
  }

  const [comments, attachments] = await Promise.all([
    getWorkOrderComments(params.id),
    getWorkOrderAttachments(params.id),
  ]);

  const serializedWorkOrder = serializeData(workOrder);
  const serializedComments = serializeData(comments);
  const serializedAttachments = serializeData(attachments);

  return (
    <WorkOrderDetailClient
      workOrder={serializedWorkOrder}
      comments={serializedComments}
      attachments={serializedAttachments}
      currentUserId={session.user.id as string}
    />
  );
}
