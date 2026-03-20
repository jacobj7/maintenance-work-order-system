import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid asset id", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = parsed.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT
          wo.*,
          COUNT(su.id)::int AS status_updates_count
        FROM work_orders wo
        LEFT JOIN status_updates su ON su.work_order_id = wo.id
        WHERE wo.asset_id = $1
        GROUP BY wo.id
        ORDER BY wo.created_at DESC
        `,
        [id],
      );

      return NextResponse.json({ data: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching work orders for asset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
