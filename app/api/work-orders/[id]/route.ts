import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z.string().optional(),
  assigned_to: z.number().nullable().optional(),
  notes: z.string().optional(),
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid work order ID" },
        { status: 400 },
      );
    }

    const workOrderResult = await query(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.location,
        wo.asset_id,
        a.name AS asset_name,
        wo.assigned_to,
        u_assigned.name AS assigned_to_name,
        wo.created_by,
        u_created.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
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
        sh.changed_at,
        sh.notes,
        sh.changed_by,
        u.name AS changed_by_name
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

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid work order ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, assigned_to, notes } = parsed.data;

    const existingResult = await query(
      `SELECT id, status, assigned_to FROM work_orders WHERE id = $1`,
      [id],
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const existing = existingResult.rows[0];
    const oldStatus = existing.status;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (assigned_to !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(assigned_to);
    }

    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    values.push(id);
    const updateQuery = `
      UPDATE work_orders
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await query(updateQuery, values);
    const updatedWorkOrder = updateResult.rows[0];

    if (status !== undefined && status !== oldStatus) {
      const userId = (session.user as { id?: number })?.id ?? null;
      await query(
        `INSERT INTO status_history (work_order_id, old_status, new_status, changed_by, changed_at, notes)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [id, oldStatus, status, userId, notes ?? null],
      );
    }

    const fullResult = await query(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.location,
        wo.asset_id,
        a.name AS asset_name,
        wo.assigned_to,
        u_assigned.name AS assigned_to_name,
        wo.created_by,
        u_created.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON wo.created_by = u_created.id
      WHERE wo.id = $1`,
      [id],
    );

    const historyResult = await query(
      `SELECT
        sh.id,
        sh.work_order_id,
        sh.old_status,
        sh.new_status,
        sh.changed_at,
        sh.notes,
        sh.changed_by,
        u.name AS changed_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at DESC`,
      [id],
    );

    return NextResponse.json({
      ...fullResult.rows[0],
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
