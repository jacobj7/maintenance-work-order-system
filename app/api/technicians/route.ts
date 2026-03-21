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
      const result = await client.query(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.created_at,
          COUNT(wo.id) FILTER (WHERE wo.status = 'open') AS open_work_orders_count
        FROM users u
        LEFT JOIN work_orders wo
          ON wo.assigned_technician_id = u.id
        WHERE u.role = 'technician'
        GROUP BY u.id, u.name, u.email, u.role, u.created_at
        ORDER BY u.name ASC
      `);

      const technicians = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        openWorkOrdersCount: parseInt(row.open_work_orders_count, 10),
      }));

      return NextResponse.json({ technicians });
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
