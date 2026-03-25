import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const PatchWorkOrderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  asset_id: z.number().int().positive().nullable().optional(),
  location_id: z.number().int().positive().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid work order ID" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const workOrderResult = await client.query(
        `SELECT 
          wo.*,
          a.name as asset_name,
          l.name as location_name,
          u.name as created_by_name
        FROM work_orders wo
        LEFT JOIN assets a ON wo.asset_id = a.id
        LEFT JOIN locations l ON wo.location_id = l.id
        LEFT JOIN users u ON wo.created_by = u.id
        WHERE wo.id = $1`,
        [id],
      );

      if (workOrderResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const workOrder = workOrderResult.rows[0];

      const assignmentsResult = await client.query(
        `SELECT 
          woa.*,
          u.name as user_name,
          u.email as user_email
        FROM work_order_assignments woa
        LEFT JOIN users u ON woa.user_id = u.id
        WHERE woa.work_order_id = $1
        ORDER BY woa.assigned_at DESC`,
        [id],
      );

      const statusUpdatesResult = await client.query(
        `SELECT 
          wsu.*,
          u.name as updated_by_name
        FROM work_order_status_updates wsu
        LEFT JOIN users u ON wsu.updated_by = u.id
        WHERE wsu.work_order_id = $1
        ORDER BY wsu.created_at DESC`,
        [id],
      );

      const partsCostsResult = await client.query(
        `SELECT 
          wopc.*,
          p.name as part_name,
          p.sku as part_sku
        FROM work_order_parts_costs wopc
        LEFT JOIN parts p ON wopc.part_id = p.id
        WHERE wopc.work_order_id = $1
        ORDER BY wopc.created_at DESC`,
        [id],
      );

      const laborEntriesResult = await client.query(
        `SELECT 
          wole.*,
          u.name as technician_name
        FROM work_order_labor_entries wole
        LEFT JOIN users u ON wole.technician_id = u.id
        WHERE wole.work_order_id = $1
        ORDER BY wole.date DESC`,
        [id],
      );

      const response = {
        ...workOrder,
        assignments: assignmentsResult.rows,
        status_updates: statusUpdatesResult.rows,
        parts_costs: partsCostsResult.rows,
        labor_entries: laborEntriesResult.rows,
      };

      return NextResponse.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid work order ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = PatchWorkOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const existingResult = await client.query(
        "SELECT id FROM work_orders WHERE id = $1",
        [id],
      );

      if (existingResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex++}`);
        values.push(data.priority);
      }
      if (data.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }
      if (data.asset_id !== undefined) {
        setClauses.push(`asset_id = $${paramIndex++}`);
        values.push(data.asset_id);
      }
      if (data.location_id !== undefined) {
        setClauses.push(`location_id = $${paramIndex++}`);
        values.push(data.location_id);
      }

      setClauses.push(`updated_at = NOW()`);

      values.push(id);

      const updateQuery = `
        UPDATE work_orders
        SET ${setClauses.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, values);

      if (data.status !== undefined) {
        await client.query(
          `INSERT INTO work_order_status_updates (work_order_id, status, updated_by, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT DO NOTHING`,
          [id, data.status, (session.user as { id?: string }).id ?? null],
        );
      }

      return NextResponse.json(updateResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
