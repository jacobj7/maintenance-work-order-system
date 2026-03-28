import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, getClient } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await query(
      `SELECT wo.*, 
        u1.name as assigned_to_name,
        u2.name as created_by_name,
        l.name as location_name
       FROM work_orders wo
       LEFT JOIN users u1 ON wo.assigned_to = u1.id
       LEFT JOIN users u2 ON wo.created_by = u2.id
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

    const historyResult = await query(
      `SELECT sh.*, u.name as changed_by_name
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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = patchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      "SELECT * FROM work_orders WHERE id = $1 FOR UPDATE",
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

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.assigned_to !== undefined) {
      fields.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assigned_to);
    }
    if (data.location_id !== undefined) {
      fields.push(`location_id = $${paramIndex++}`);
      values.push(data.location_id);
    }
    if (data.due_date !== undefined) {
      fields.push(`due_date = $${paramIndex++}`);
      values.push(data.due_date);
    }

    fields.push(`updated_at = NOW()`);

    values.push(id);
    const updateQuery = `UPDATE work_orders SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;

    const updateResult = await client.query(updateQuery, values);
    const updatedWorkOrder = updateResult.rows[0];

    const { status } = data;
    if (status !== undefined && status !== oldStatus) {
      await client.query(
        `INSERT INTO status_history (work_order_id, old_status, new_status, changed_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, oldStatus, status, session.user?.id],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ workOrder: updatedWorkOrder });
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const result = await query(
      "DELETE FROM work_orders WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Work order deleted successfully" });
  } catch (error) {
    console.error("Error deleting work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
