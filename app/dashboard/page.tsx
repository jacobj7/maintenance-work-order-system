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

  let statusCounts = {
    open: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  };

  let recentTickets: any[] = [];
  let technicians: any[] = [];

  try {
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count
      FROM tickets
      GROUP BY status
    `);

    for (const row of statusResult.rows) {
      const status = row.status as string;
      const count = parseInt(row.count, 10);
      if (status === "open") statusCounts.open = count;
      else if (status === "in_progress") statusCounts.in_progress = count;
      else if (status === "completed") statusCounts.completed = count;
      else if (status === "overdue") statusCounts.overdue = count;
    }

    const overdueResult = await db.query(`
      SELECT COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('completed', 'cancelled')
        AND due_date < NOW()
    `);
    statusCounts.overdue = parseInt(overdueResult.rows[0]?.count ?? "0", 10);

    const ticketsResult = await db.query(`
      SELECT
        t.id,
        t.title,
        t.status,
        t.priority,
        t.created_at,
        t.due_date,
        u.name as customer_name,
        tech.name as technician_name
      FROM tickets t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN users tech ON t.technician_id = tech.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    recentTickets = ticketsResult.rows;

    const techResult = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COUNT(t.id) as active_tickets
      FROM users u
      LEFT JOIN tickets t ON t.technician_id = u.id
        AND t.status NOT IN ('completed', 'cancelled')
      WHERE u.role = 'technician'
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `);
    technicians = techResult.rows;
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
  }

  return (
    <DashboardClient
      session={session}
      statusCounts={statusCounts}
      recentTickets={recentTickets}
      technicians={technicians}
    />
  );
}
