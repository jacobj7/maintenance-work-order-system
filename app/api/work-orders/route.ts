import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createWorkOrderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  assigned_technician_id: z.number().int().positive().optional().nullable(),
  location: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  asset_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`wo.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`wo.priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        wo.location,
        wo.due_date,
        wo.asset_id,
        wo.notes,
        wo.assigned_technician_id,
        wo.created_at,
        wo.updated_at,
        u.name AS assigned_technician_name,
        u.email AS assigned_technician_email
      FROM work_orders wo
      LEFT JOIN users u ON wo.assigned_technician_id = u.id
      ${whereClause}
      ORDER BY
        CASE wo.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        wo.created_at DESC
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json({
        work_orders: result.rows,
        total: result.rowCount,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createWorkOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertWorkOrderQuery = `
        INSERT INTO work_orders (
          title,
          description,
          priority,
          status,
          assigned_technician_id,
          location,
          due_date,
          asset_id,
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          NOW(), NOW()
        )
        RETURNING *
      `;

      const workOrderResult = await client.query(insertWorkOrderQuery, [
        data.title,
        data.description ?? null,
        data.priority,
        data.status,
        data.assigned_technician_id ?? null,
        data.location ?? null,
        data.due_date ?? null,
        data.asset_id ?? null,
        data.notes ?? null,
      ]);

      const newWorkOrder = workOrderResult.rows[0];

      const insertStatusHistoryQuery = `
        INSERT INTO status_history (
          work_order_id,
          status,
          changed_by,
          changed_at,
          notes
        ) VALUES (
          $1, $2, $3, NOW(), $4
        )
        RETURNING *
      `;

      const statusHistoryResult = await client.query(insertStatusHistoryQuery, [
        newWorkOrder.id,
        data.status,
        session.user?.email ?? "system",
        `Initial status set to ${data.status}`,
      ]);

      await client.query("COMMIT");

      return NextResponse.json(
        {
          work_order: newWorkOrder,
          status_history: statusHistoryResult.rows[0],
        },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
