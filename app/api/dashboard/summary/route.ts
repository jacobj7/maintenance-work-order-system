import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  try {
    let openCountResult;
    let inProgressCountResult;
    let completedCountResult;
    let overdueCountResult;
    let priorityBreakdownResult;
    let recentActivityResult;

    if (role === "technician") {
      openCountResult = await query(
        `SELECT COUNT(*) AS open_count
         FROM work_orders
         WHERE assigned_to = $1
           AND status NOT IN ('completed', 'cancelled')`,
        [userId],
      );

      inProgressCountResult = await query(
        `SELECT COUNT(*) AS in_progress_count
         FROM work_orders
         WHERE assigned_to = $1
           AND status = 'in_progress'`,
        [userId],
      );

      completedCountResult = await query(
        `SELECT COUNT(*) AS completed_count
         FROM work_orders
         WHERE assigned_to = $1
           AND status = 'completed'`,
        [userId],
      );

      overdueCountResult = await query(
        `SELECT COUNT(*) AS overdue_count
         FROM work_orders
         WHERE assigned_to = $1
           AND status NOT IN ('completed', 'cancelled')
           AND due_date < NOW()`,
        [userId],
      );

      priorityBreakdownResult = await query(
        `SELECT priority, COUNT(*) AS count
         FROM work_orders
         WHERE assigned_to = $1
           AND status NOT IN ('completed', 'cancelled')
         GROUP BY priority
         ORDER BY priority`,
        [userId],
      );

      recentActivityResult = await query(
        `SELECT id, title, status, priority, due_date, updated_at
         FROM work_orders
         WHERE assigned_to = $1
         ORDER BY updated_at DESC
         LIMIT 10`,
        [userId],
      );
    } else {
      openCountResult = await query(
        `SELECT COUNT(*) AS open_count
         FROM work_orders
         WHERE status NOT IN ('completed', 'cancelled')`,
        [],
      );

      inProgressCountResult = await query(
        `SELECT COUNT(*) AS in_progress_count
         FROM work_orders
         WHERE status = 'in_progress'`,
        [],
      );

      completedCountResult = await query(
        `SELECT COUNT(*) AS completed_count
         FROM work_orders
         WHERE status = 'completed'`,
        [],
      );

      overdueCountResult = await query(
        `SELECT COUNT(*) AS overdue_count
         FROM work_orders
         WHERE status NOT IN ('completed', 'cancelled')
           AND due_date < NOW()`,
        [],
      );

      priorityBreakdownResult = await query(
        `SELECT priority, COUNT(*) AS count
         FROM work_orders
         WHERE status NOT IN ('completed', 'cancelled')
         GROUP BY priority
         ORDER BY priority`,
        [],
      );

      recentActivityResult = await query(
        `SELECT id, title, status, priority, due_date, updated_at
         FROM work_orders
         ORDER BY updated_at DESC
         LIMIT 10`,
        [],
      );
    }

    const summary = {
      openCount: parseInt(openCountResult.rows[0]?.open_count ?? "0", 10),
      inProgressCount: parseInt(
        inProgressCountResult.rows[0]?.in_progress_count ?? "0",
        10,
      ),
      completedCount: parseInt(
        completedCountResult.rows[0]?.completed_count ?? "0",
        10,
      ),
      overdueCount: parseInt(
        overdueCountResult.rows[0]?.overdue_count ?? "0",
        10,
      ),
      priorityBreakdown: priorityBreakdownResult.rows.map((row) => ({
        priority: row.priority,
        count: parseInt(row.count, 10),
      })),
      recentActivity: recentActivityResult.rows,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
