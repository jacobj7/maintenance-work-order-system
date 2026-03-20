import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      const result = await client.query(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.org_id,
          COUNT(wo.id) FILTER (
            WHERE wo.status IN ('open', 'in_progress')
          ) AS open_work_order_count
        FROM users u
        LEFT JOIN work_orders wo
          ON wo.technician_id = u.id
          AND wo.org_id = u.org_id
        WHERE u.role = 'technician'
          AND u.org_id = $1
        GROUP BY u.id, u.name, u.email, u.role, u.org_id
        ORDER BY u.name ASC
        `,
        [orgId],
      );

      const technicians = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        orgId: row.org_id,
        openWorkOrderCount: parseInt(row.open_work_order_count, 10),
      }));

      return NextResponse.json({ technicians }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
