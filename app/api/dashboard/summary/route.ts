import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const statusCountsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
      FROM work_orders
    `);

    const priorityCountsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE priority = 'low') AS low_count,
        COUNT(*) FILTER (WHERE priority = 'medium') AS medium_count,
        COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
        COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_count
      FROM work_orders
      WHERE status != 'completed'
    `);

    const technicianCountsResult = await client.query(`
      SELECT
        u.id AS technician_id,
        u.name AS technician_name,
        u.email AS technician_email,
        COUNT(wo.id) AS open_work_order_count
      FROM users u
      LEFT JOIN work_orders wo
        ON wo.assigned_technician_id = u.id
        AND wo.status IN ('open', 'in_progress')
      WHERE u.role = 'technician'
      GROUP BY u.id, u.name, u.email
      ORDER BY open_work_order_count DESC, u.name ASC
    `);

    const statusCounts = statusCountsResult.rows[0];
    const priorityCounts = priorityCountsResult.rows[0];
    const technicianCounts = technicianCountsResult.rows;

    return NextResponse.json({
      status: {
        open: parseInt(statusCounts.open_count, 10),
        in_progress: parseInt(statusCounts.in_progress_count, 10),
        completed: parseInt(statusCounts.completed_count, 10),
      },
      priority: {
        low: parseInt(priorityCounts.low_count, 10),
        medium: parseInt(priorityCounts.medium_count, 10),
        high: parseInt(priorityCounts.high_count, 10),
        urgent: parseInt(priorityCounts.urgent_count, 10),
      },
      technicians: technicianCounts.map((row) => ({
        id: row.technician_id,
        name: row.technician_name,
        email: row.technician_email,
        openWorkOrderCount: parseInt(row.open_work_order_count, 10),
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
