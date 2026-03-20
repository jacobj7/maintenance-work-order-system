import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();

    try {
      const totalOpenResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status = 'open'
      `);

      const totalInProgressResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status = 'in_progress'
      `);

      const totalCompletedThisMonthResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status = 'completed'
          AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
      `);

      const totalOverdueResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status NOT IN ('completed', 'closed')
          AND due_date < CURRENT_TIMESTAMP
      `);

      const technicianWorkloadResult = await client.query(`
        SELECT
          u.name AS technician_name,
          COUNT(t.id) FILTER (WHERE t.status = 'open') AS assigned_count,
          COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_count
        FROM users u
        LEFT JOIN tickets t ON t.assigned_to = u.id
        WHERE u.role = 'technician'
        GROUP BY u.id, u.name
        ORDER BY u.name ASC
      `);

      const summary = {
        total_open: parseInt(totalOpenResult.rows[0]?.count ?? "0", 10),
        total_in_progress: parseInt(
          totalInProgressResult.rows[0]?.count ?? "0",
          10,
        ),
        total_completed_this_month: parseInt(
          totalCompletedThisMonthResult.rows[0]?.count ?? "0",
          10,
        ),
        total_overdue: parseInt(totalOverdueResult.rows[0]?.count ?? "0", 10),
        technician_workload: technicianWorkloadResult.rows.map((row) => ({
          technician_name: row.technician_name,
          assigned_count: parseInt(row.assigned_count ?? "0", 10),
          in_progress_count: parseInt(row.in_progress_count ?? "0", 10),
        })),
      };

      return NextResponse.json(summary);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
