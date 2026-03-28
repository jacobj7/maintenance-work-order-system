import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;

    const openCountResult = await query(
      `SELECT COUNT(*) AS open_count
       FROM work_orders
       WHERE user_id = $1
         AND status NOT IN ('completed', 'cancelled')`,
      [userId],
    );

    const overdueCountResult = await query(
      `SELECT COUNT(*) AS overdue_count
       FROM work_orders
       WHERE user_id = $1
         AND due_date < NOW()
         AND status NOT IN ('completed', 'cancelled')`,
      [userId],
    );

    const costsResult = await query(
      `SELECT
         COALESCE(SUM(estimated_cost), 0) AS total_estimated_cost,
         COALESCE(SUM(actual_cost), 0) AS total_actual_cost
       FROM work_orders
       WHERE user_id = $1`,
      [userId],
    );

    const completedThisMonthResult = await query(
      `SELECT COUNT(*) AS completed_this_month
       FROM work_orders
       WHERE user_id = $1
         AND status = 'completed'
         AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())`,
      [userId],
    );

    const summary = {
      open_count: parseInt(openCountResult.rows[0]?.open_count ?? "0", 10),
      overdue_count: parseInt(
        overdueCountResult.rows[0]?.overdue_count ?? "0",
        10,
      ),
      total_estimated_cost: parseFloat(
        costsResult.rows[0]?.total_estimated_cost ?? "0",
      ),
      total_actual_cost: parseFloat(
        costsResult.rows[0]?.total_actual_cost ?? "0",
      ),
      completed_this_month: parseInt(
        completedThisMonthResult.rows[0]?.completed_this_month ?? "0",
        10,
      ),
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
