import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

const updateWorkOrderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  asset_id: z.number().int().positive().nullable().optional(),
  location_id: z.number().int().positive().nullable().optional(),
  due_date: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
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
    const result = await client.query(
      `SELECT
        wo.*,
        u1.name AS requester_name,
        u1.email AS requester_email,
        u2.name AS assignee_name,
        u2.email AS assignee_email,
        a.name AS asset_name,
        l.name AS location_name
      FROM work_orders wo
      LEFT JOIN users u1 ON wo.requester_id = u1.id
      LEFT JOIN users u2 ON wo.assigned_to = u2.id
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      WHERE wo.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const historyResult = await client.query(
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
  } finally {
    client.release();
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

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationResult = updateWorkOrderSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 422 },
    );
  }

  const updates = validationResult.data;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT * FROM work_orders WHERE id = $1",
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

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      title: "title",
      description: "description",
      status: "status",
      priority: "priority",
      assigned_to: "assigned_to",
      asset_id: "asset_id",
      location_id: "location_id",
      due_date: "due_date",
      notes: "notes",
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${column} = $${paramIndex}`);
        values.push(updates[key as keyof typeof updates]);
        paramIndex++;
      }
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const updateResult = await client.query(
      `UPDATE work_orders SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    const statusChanged =
      updates.status !== undefined && updates.status !== existing.status;

    if (statusChanged) {
      const userId = (session.user as { id?: number | string }).id ?? null;

      await client.query(
        `INSERT INTO status_history (work_order_id, old_status, new_status, changed_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, existing.status, updates.status, userId],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ workOrder: updateResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating work order:", error);
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
  if (userRole !== "admin" && userRole !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT id FROM work_orders WHERE id = $1",
      [id],
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    await client.query("DELETE FROM status_history WHERE work_order_id = $1", [
      id,
    ]);

    await client.query("DELETE FROM work_orders WHERE id = $1", [id]);

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
