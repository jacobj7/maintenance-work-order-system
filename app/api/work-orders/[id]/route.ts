import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const workOrderResult = await query(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.assigned_to,
        wo.created_by,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.location,
        wo.asset_id,
        u_assigned.name AS assigned_to_name,
        u_assigned.email AS assigned_to_email,
        u_created.name AS created_by_name,
        u_created.email AS created_by_email
      FROM work_orders wo
      LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON wo.created_by = u_created.id
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

    const historyResult = await query(
      `SELECT
        sh.id,
        sh.work_order_id,
        sh.old_status,
        sh.new_status,
        sh.changed_by,
        sh.changed_at,
        sh.notes,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at DESC`,
      [id],
    );

    return NextResponse.json({
      ...workOrder,
      status_history: historyResult.rows,
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
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates = parsed.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const existingResult = await query(
      `SELECT id, status, priority, assigned_to FROM work_orders WHERE id = $1`,
      [id],
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const existing = existingResult.rows[0];

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }

    if ("assigned_to" in updates) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(updates.assigned_to);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const updateResult = await query(
      `UPDATE work_orders
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    const updatedWorkOrder = updateResult.rows[0];

    if (updates.status !== undefined && updates.status !== existing.status) {
      const userId = (session.user as { id?: string })?.id ?? null;
      await query(
        `INSERT INTO status_history (work_order_id, old_status, new_status, changed_by, changed_at, notes)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [id, existing.status, updates.status, userId, body.notes ?? null],
      );
    }

    const historyResult = await query(
      `SELECT
        sh.id,
        sh.work_order_id,
        sh.old_status,
        sh.new_status,
        sh.changed_by,
        sh.changed_at,
        sh.notes,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at DESC`,
      [id],
    );

    return NextResponse.json({
      ...updatedWorkOrder,
      status_history: historyResult.rows,
    });
  } catch (error) {
    console.error("PATCH /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
