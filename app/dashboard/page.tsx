import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as { role?: string }).role;

  if (userRole === "technician") {
    redirect("/technician");
  }

  if (userRole !== "manager") {
    redirect("/login");
  }

  let workOrders: {
    id: number;
    title: string;
    status: string;
    priority: string;
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
  }[] = [];

  let summary: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    highPriority: number;
  } = {
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    highPriority: 0,
  };

  try {
    const workOrdersResult = await db.query(
      `SELECT 
        wo.id,
        wo.title,
        wo.status,
        wo.priority,
        u.name AS "assignedTo",
        wo.created_at AS "createdAt",
        wo.updated_at AS "updatedAt"
      FROM work_orders wo
      LEFT JOIN users u ON wo.assigned_to = u.id
      ORDER BY wo.created_at DESC
      LIMIT 50`,
    );

    workOrders = workOrdersResult.rows.map((row) => ({
      id: Number(row.id),
      title: String(row.title),
      status: String(row.status),
      priority: String(row.priority),
      assignedTo: row.assignedTo ? String(row.assignedTo) : null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
    }));

    const summaryResult = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE priority = 'high') AS high_priority
      FROM work_orders`,
    );

    if (summaryResult.rows.length > 0) {
      const row = summaryResult.rows[0];
      summary = {
        total: Number(row.total),
        open: Number(row.open),
        inProgress: Number(row.in_progress),
        completed: Number(row.completed),
        highPriority: Number(row.high_priority),
      };
    }
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }

  const serializedUser = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: userRole ?? null,
  };

  return (
    <DashboardClient
      user={serializedUser}
      workOrders={workOrders}
      summary={summary}
    />
  );
}
