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
    const statusCountsResult = await client.query<{
      status: string;
      count: string;
    }>(`
      SELECT status, COUNT(*) as count
      FROM work_orders
      GROUP BY status
      ORDER BY status
    `);

    const overdueResult = await client.query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM work_orders
      WHERE due_date < NOW()
        AND status NOT IN ('completed', 'cancelled')
    `);

    const statusCounts: Record<string, number> = {};
    for (const row of statusCountsResult.rows) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    const overdueCount = parseInt(overdueResult.rows[0]?.count ?? "0", 10);

    return NextResponse.json({
      statusCounts,
      overdueCount,
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
