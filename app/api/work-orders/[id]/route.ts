import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const workOrderStateMachine: Record<string, string[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  const allowed = workOrderStateMachine[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

const PatchBodySchema = z.object({
  status: z.string(),
  changed_by: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const client = await pool.connect();
  try {
    const workOrderResult = await client.query(
      `
      SELECT
        wo.*,
        a.id AS asset_id,
        a.name AS asset_name,
        a.serial_number AS asset_serial_number,
        a.model AS asset_model,
        a.manufacturer AS asset_manufacturer,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        l.floor AS location_floor,
        l.room AS location_room
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      WHERE wo.id = $1
      `,
      [id],
    );

    if (workOrderResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const row = workOrderResult.rows[0];

    const assignmentsResult = await client.query(
      `
      SELECT
        woa.*,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email
      FROM work_order_assignments woa
      LEFT JOIN users u ON woa.user_id = u.id
      WHERE woa.work_order_id = $1
      ORDER BY woa.assigned_at DESC
      `,
      [id],
    );

    const statusHistoryResult = await client.query(
      `
      SELECT
        sh.*,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.work_order_id = $1
      ORDER BY sh.changed_at DESC
      `,
      [id],
    );

    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
      due_date: row.due_date,
      completed_at: row.completed_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            serial_number: row.asset_serial_number,
            model: row.asset_model,
            manufacturer: row.asset_manufacturer,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
            floor: row.location_floor,
            room: row.location_room,
          }
        : null,
      assignments: assignmentsResult.rows.map((a) => ({
        id: a.id,
        assigned_at: a.assigned_at,
        role: a.role,
        user: a.user_id
          ? {
              id: a.user_id,
              name: a.user_name,
              email: a.user_email,
            }
          : null,
      })),
      status_history: statusHistoryResult.rows.map((h) => ({
        id: h.id,
        from_status: h.from_status,
        to_status: h.to_status,
        changed_at: h.changed_at,
        notes: h.notes,
        changed_by: h.changed_by
          ? {
              id: h.changed_by,
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
  } finally {
    client.release();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = PatchBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status: newStatus, changed_by, notes } = parseResult.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT id, status FROM work_orders WHERE id = $1 FOR UPDATE",
      [id],
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const currentStatus = currentResult.rows[0].status;

    if (!canTransition(currentStatus, newStatus)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          allowed_transitions: workOrderStateMachine[currentStatus] ?? [],
        },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();

    const updateFields: string[] = ["status = $1", "updated_at = $2"];
    const updateValues: unknown[] = [newStatus, now];
    let paramIndex = 3;

    if (newStatus === "completed") {
      updateFields.push(`completed_at = $${paramIndex}`);
      updateValues.push(now);
      paramIndex++;
    }

    updateValues.push(id);
    const updateQuery = `
      UPDATE work_orders
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    await client.query(
      `
      INSERT INTO status_history (work_order_id, from_status, to_status, changed_at, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [id, currentStatus, newStatus, now, changed_by ?? null, notes ?? null],
    );

    await client.query("COMMIT");

    return NextResponse.json({ data: updateResult.rows[0] });
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
