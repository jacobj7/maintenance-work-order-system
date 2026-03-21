import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const statusCountsResult = await db.query(
    `SELECT status, COUNT(*)::int AS count
     FROM work_orders
     GROUP BY status
     ORDER BY status`,
  );

  const overdueResult = await db.query(
    `SELECT
       id,
       title,
       status,
       priority,
       target_date,
       assigned_to,
       created_at
     FROM work_orders
     WHERE target_date < NOW()
       AND status != 'Completed'
     ORDER BY target_date ASC
     LIMIT 50`,
  );

  const statusCounts: { status: string; count: number }[] =
    statusCountsResult.rows.map((row) => ({
      status: String(row.status),
      count: Number(row.count),
    }));

  const overdueWorkOrders: {
    id: string;
    title: string;
    status: string;
    priority: string;
    target_date: string;
    assigned_to: string | null;
    created_at: string;
  }[] = overdueResult.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    priority: String(row.priority),
    target_date:
      row.target_date instanceof Date
        ? row.target_date.toISOString()
        : String(row.target_date),
    assigned_to: row.assigned_to != null ? String(row.assigned_to) : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }));

  return (
    <DashboardClient
      statusCounts={statusCounts}
      overdueWorkOrders={overdueWorkOrders}
      user={{
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
      }}
    />
  );
}
