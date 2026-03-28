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
  assigned_to: z.number().int().positive().nullable().optional(),
  notes: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  scheduled_date: z.string().datetime().nullable().optional(),
  resolution_notes: z.string().max(5000).nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = parseInt(params.id, 10);
    if (isNaN(workOrderId)) {
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
        wo.notes,
        wo.resolution_notes,
        wo.scheduled_date,
        wo.completed_at,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        a.serial_number AS asset_serial,
        a.model AS asset_model,
        l.id AS location_id,
        l.name AS location_name,
        l.building AS location_building,
        l.floor AS location_floor,
        l.room AS location_room,
        creator.id AS created_by_id,
        creator.name AS created_by_name,
        creator.email AS created_by_email,
        assignee.id AS assigned_to_id,
        assignee.name AS assigned_to_name,
        assignee.email AS assigned_to_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      WHERE wo.id = $1`,
      [workOrderId],
    );

    if (workOrderResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const row = workOrderResult.rows[0];

    const historyResult = await query(
      `SELECT
        sh.id,
        sh.from_status,
        sh.to_status,
        sh.changed_at,
        sh.notes AS change_notes,
        u.id AS changed_by_id,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at ASC`,
      [workOrderId],
    );

    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      resolution_notes: row.resolution_notes,
      scheduled_date: row.scheduled_date,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            asset_tag: row.asset_tag,
            serial_number: row.asset_serial,
            model: row.asset_model,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            building: row.location_building,
            floor: row.location_floor,
            room: row.location_room,
          }
        : null,
      created_by: row.created_by_id
        ? {
            id: row.created_by_id,
            name: row.created_by_name,
            email: row.created_by_email,
          }
        : null,
      assigned_to: row.assigned_to_id
        ? {
            id: row.assigned_to_id,
            name: row.assigned_to_name,
            email: row.assigned_to_email,
          }
        : null,
      status_history: historyResult.rows.map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        changed_at: h.changed_at,
        notes: h.change_notes,
        changed_by: h.changed_by_id
          ? {
              id: h.changed_by_id,
              name: h.changed_by_name,
              email: h.changed_by_email,
            }
          : null,
      })),
    };

    return NextResponse.json({ data: workOrder });
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = parseInt(params.id, 10);
    if (isNaN(workOrderId)) {
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

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
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
      `SELECT id, status, assigned_to FROM work_orders WHERE id = $1`,
      [workOrderId],
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const existing = existingResult.rows[0];
    const previousStatus = existing.status;
    const newStatus = updates.status;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);

      if (updates.status === "completed") {
        setClauses.push(`completed_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
      } else if (
        previousStatus === "completed" &&
        updates.status !== "completed"
      ) {
        setClauses.push(`completed_at = $${paramIndex++}`);
        values.push(null);
      }
    }

    if ("assigned_to" in updates) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(updates.assigned_to);
    }

    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(updates.notes);
    }

    if (updates.priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }

    if ("scheduled_date" in updates) {
      setClauses.push(`scheduled_date = $${paramIndex++}`);
      values.push(updates.scheduled_date);
    }

    if ("resolution_notes" in updates) {
      setClauses.push(`resolution_notes = $${paramIndex++}`);
      values.push(updates.resolution_notes);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    values.push(workOrderId);
    const workOrderParamIndex = paramIndex;

    const updateResult = await query(
      `UPDATE work_orders
       SET ${setClauses.join(", ")}
       WHERE id = $${workOrderParamIndex}
       RETURNING *`,
      values,
    );

    const updatedWorkOrder = updateResult.rows[0];

    if (newStatus !== undefined && newStatus !== previousStatus) {
      const userId = (session.user as { id?: number | string }).id;
      const numericUserId = userId ? parseInt(String(userId), 10) : null;

      await query(
        `INSERT INTO status_history
          (work_order_id, from_status, to_status, changed_by, changed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          workOrderId,
          previousStatus,
          newStatus,
          numericUserId,
          new Date().toISOString(),
          updates.notes ?? null,
        ],
      );
    }

    const fullResult = await query(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.notes,
        wo.resolution_notes,
        wo.scheduled_date,
        wo.completed_at,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        a.serial_number AS asset_serial,
        a.model AS asset_model,
        l.id AS location_id,
        l.name AS location_name,
        l.building AS location_building,
        l.floor AS location_floor,
        l.room AS location_room,
        creator.id AS created_by_id,
        creator.name AS created_by_name,
        creator.email AS created_by_email,
        assignee.id AS assigned_to_id,
        assignee.name AS assigned_to_name,
        assignee.email AS assigned_to_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      WHERE wo.id = $1`,
      [workOrderId],
    );

    const historyResult = await query(
      `SELECT
        sh.id,
        sh.from_status,
        sh.to_status,
        sh.changed_at,
        sh.notes AS change_notes,
        u.id AS changed_by_id,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at ASC`,
      [workOrderId],
    );

    const r = fullResult.rows[0];

    const responseData = {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      notes: r.notes,
      resolution_notes: r.resolution_notes,
      scheduled_date: r.scheduled_date,
      completed_at: r.completed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      asset: r.asset_id
        ? {
            id: r.asset_id,
            name: r.asset_name,
            asset_tag: r.asset_tag,
            serial_number: r.asset_serial,
            model: r.asset_model,
          }
        : null,
      location: r.location_id
        ? {
            id: r.location_id,
            name: r.location_name,
            building: r.location_building,
            floor: r.location_floor,
            room: r.location_room,
          }
        : null,
      created_by: r.created_by_id
        ? {
            id: r.created_by_id,
            name: r.created_by_name,
            email: r.created_by_email,
          }
        : null,
      assigned_to: r.assigned_to_id
        ? {
            id: r.assigned_to_id,
            name: r.assigned_to_name,
            email: r.assigned_to_email,
          }
        : null,
      status_history: historyResult.rows.map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        changed_at: h.changed_at,
        notes: h.change_notes,
        changed_by: h.changed_by_id
          ? {
              id: h.changed_by_id,
              name: h.changed_by_name,
              email: h.changed_by_email,
            }
          : null,
      })),
    };

    return NextResponse.json({ data: responseData });
  } catch (error) {
    console.error("PATCH /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
