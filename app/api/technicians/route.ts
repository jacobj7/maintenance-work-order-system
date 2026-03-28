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

    const result = await query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(wo.id) AS workload_count
      FROM users u
      LEFT JOIN work_orders wo
        ON wo.assigned_to = u.id
        AND wo.status NOT IN ('completed', 'cancelled')
      WHERE u.role IN ('technician', 'admin')
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name ASC
      `,
      [],
    );

    const technicians = result.rows.map(
      (row: {
        id: string;
        name: string;
        email: string;
        role: string;
        workload_count: string;
      }) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        workload_count: parseInt(row.workload_count, 10),
      }),
    );

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error("Error fetching technicians:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
