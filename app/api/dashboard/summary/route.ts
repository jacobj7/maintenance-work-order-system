import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const workOrderStatusResult = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft,
        COUNT(*) AS total
      FROM work_orders
      WHERE org_id = $1`,
      [orgId],
    );

    const assetsResult = await query(
      `SELECT COUNT(*) AS total
      FROM assets
      WHERE org_id = $1`,
      [orgId],
    );

    const techniciansResult = await query(
      `SELECT COUNT(*) AS total
      FROM users
      WHERE org_id = $1 AND role = 'technician'`,
      [orgId],
    );

    const workOrderRow = workOrderStatusResult.rows[0];
    const assetsRow = assetsResult.rows[0];
    const techniciansRow = techniciansResult.rows[0];

    return NextResponse.json({
      workOrders: {
        total: parseInt(workOrderRow.total, 10),
        byStatus: {
          open: parseInt(workOrderRow.open, 10),
          in_progress: parseInt(workOrderRow.in_progress, 10),
          completed: parseInt(workOrderRow.completed, 10),
          draft: parseInt(workOrderRow.draft, 10),
        },
      },
      assets: {
        total: parseInt(assetsRow.total, 10),
      },
      technicians: {
        total: parseInt(techniciansRow.total, 10),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
