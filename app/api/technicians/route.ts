import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(wo.id) FILTER (WHERE wo.status NOT IN ('completed', 'closed', 'cancelled')) AS open_work_orders_count
      FROM users u
      LEFT JOIN work_orders wo ON wo.assigned_technician_id = u.id
      WHERE u.role = 'Technician'
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name ASC
      `,
      [],
    );

    const technicians = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      openWorkOrdersCount: parseInt(row.open_work_orders_count, 10) || 0,
    }));

    return NextResponse.json({ technicians }, { status: 200 });
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
