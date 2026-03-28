import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  asset_id: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  comment: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await query(
      `SELECT
        wo.*,
        u.name AS assigned_to_name,
        u.email AS assigned_to_email,
        a.name AS asset_name,
        l.name AS location_name,
        f.name AS facility_name,
        creator.name AS created_by_name
       FROM work_orders wo
       LEFT JOIN users u ON wo.assigned_to = u.id
       LEFT JOIN assets a ON wo.asset_id = a.id
       LEFT JOIN locations l ON wo.location_id = l.id
       LEFT JOIN facilities f ON wo.facility_id = f.id
       LEFT JOIN users creator ON wo.created_by = creator.id
       WHERE wo.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const historyResult = await query(
      `SELECT
        sh.*,
        u.name AS changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by = u.id
       WHERE sh.work_order_id = $1
       ORDER BY sh.created_at DESC`,
      [id],
    );

    return NextResponse.json({
      workOrder: result.rows[0],
      statusHistory: historyResult.rows,
    });
  } catch (error) {
    console.error("GET /api/work-orders/[id] error:", error);
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the row to prevent concurrent updates
    const existingResult = await client.query(
      `SELECT id, status, facility_id FROM work_orders WHERE id = $1 FOR UPDATE`,
      [id],
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const existing = existingResult.rows[0];
    const oldStatus = existing.status;

    // Build dynamic SET clause
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
    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.assigned_to !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assigned_to);
    }
    if (data.asset_id !== undefined) {
      setClauses.push(`asset_id = $${paramIndex++}`);
      values.push(data.asset_id);
    }
    if (data.location_id !== undefined) {
      setClauses.push(`location_id = $${paramIndex++}`);
      values.push(data.location_id);
    }
    if (data.due_date !== undefined) {
      setClauses.push(`due_date = $${paramIndex++}`);
      values.push(data.due_date);
    }

    setClauses.push(`updated_at = NOW()`);

    values.push(id);
    const updateSql = `
      UPDATE work_orders
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateSql, values);
    const updatedWorkOrder = updateResult.rows[0];

    // Insert status_history if status changed
    if (data.status !== undefined && data.status !== oldStatus) {
      await client.query(
        `INSERT INTO status_history
          (work_order_id, old_status, new_status, changed_by, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          id,
          oldStatus,
          data.status,
          (session.user as { id: string }).id,
          data.comment ?? null,
        ],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ workOrder: updatedWorkOrder });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "admin" && userRole !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const result = await query(
      `DELETE FROM work_orders WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
