import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openResult = await query(
      `SELECT COUNT(*) AS count FROM work_orders WHERE status = 'open'`,
      [],
    );

    const inProgressResult = await query(
      `SELECT COUNT(*) AS count FROM work_orders WHERE status = 'in_progress'`,
      [],
    );

    const overdueResult = await query(
      `SELECT COUNT(*) AS count FROM work_orders WHERE due_date < NOW() AND status != 'completed'`,
      [],
    );

    const completedResult = await query(
      `SELECT COUNT(*) AS count FROM work_orders WHERE status = 'completed'`,
      [],
    );

    const summary = {
      open: parseInt(openResult.rows[0]?.count ?? "0", 10),
      in_progress: parseInt(inProgressResult.rows[0]?.count ?? "0", 10),
      overdue: parseInt(overdueResult.rows[0]?.count ?? "0", 10),
      completed: parseInt(completedResult.rows[0]?.count ?? "0", 10),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
