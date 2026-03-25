import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const totalResult = await client.query(
      "SELECT COUNT(*) AS count FROM work_orders",
    );

    const openResult = await client.query(
      "SELECT COUNT(*) AS count FROM work_orders WHERE status = 'open'",
    );

    const inProgressResult = await client.query(
      "SELECT COUNT(*) AS count FROM work_orders WHERE status = 'in_progress'",
    );

    const completedResult = await client.query(
      "SELECT COUNT(*) AS count FROM work_orders WHERE status = 'completed'",
    );

    const overdueResult = await client.query(
      `SELECT COUNT(*) AS count FROM work_orders
       WHERE status != 'completed'
         AND created_at < NOW() - INTERVAL '7 days'`,
    );

    const priorityResult = await client.query(
      `SELECT priority, COUNT(*) AS count
       FROM work_orders
       GROUP BY priority`,
    );

    const byPriority: Record<string, number> = {};
    for (const row of priorityResult.rows) {
      byPriority[row.priority] = parseInt(row.count, 10);
    }

    return NextResponse.json({
      total: parseInt(totalResult.rows[0].count, 10),
      open: parseInt(openResult.rows[0].count, 10),
      in_progress: parseInt(inProgressResult.rows[0].count, 10),
      completed: parseInt(completedResult.rows[0].count, 10),
      overdue: parseInt(overdueResult.rows[0].count, 10),
      by_priority: byPriority,
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
