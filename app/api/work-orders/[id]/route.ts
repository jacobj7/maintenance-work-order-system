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

const patchSchema = z.object({
  status: z.string(),
  notes: z.string().optional(),
  changed_by: z.string().uuid().optional(),
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
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.type,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.completed_at,
        wo.estimated_hours,
        wo.actual_hours,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        a.model,
        a.manufacturer,
        l.id AS location_id,
        l.name AS location_name,
        l.building,
        l.floor,
        l.room,
        r.id AS requestor_id,
        r.name AS requestor_name,
        r.email AS requestor_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users r ON wo.requestor_id = r.id
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

    const workOrder = workOrderResult.rows[0];

    const assignmentsResult = await client.query(
      `
      SELECT
        wa.id,
        wa.work_order_id,
        wa.assigned_at,
        wa.role,
        t.id AS technician_id,
        t.name AS technician_name,
        t.email AS technician_email,
        t.phone AS technician_phone
      FROM work_order_assignments wa
      LEFT JOIN users t ON wa.technician_id = t.id
      WHERE wa.work_order_id = $1
      ORDER BY wa.assigned_at ASC
      `,
      [id],
    );

    const statusEventsResult = await client.query(
      `
      SELECT
        se.id,
        se.work_order_id,
        se.from_status,
        se.to_status,
        se.notes,
        se.created_at,
        u.id AS changed_by_id,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM status_events se
      LEFT JOIN users u ON se.changed_by = u.id
      WHERE se.work_order_id = $1
      ORDER BY se.created_at ASC
      `,
      [id],
    );

    const partsLogResult = await client.query(
      `
      SELECT
        pl.id,
        pl.work_order_id,
        pl.part_number,
        pl.part_name,
        pl.quantity,
        pl.unit_cost,
        pl.total_cost,
        pl.notes,
        pl.logged_at,
        u.id AS logged_by_id,
        u.name AS logged_by_name
      FROM parts_log pl
      LEFT JOIN users u ON pl.logged_by = u.id
      WHERE pl.work_order_id = $1
      ORDER BY pl.logged_at ASC
      `,
      [id],
    );

    const laborLogResult = await client.query(
      `
      SELECT
        ll.id,
        ll.work_order_id,
        ll.hours,
        ll.description,
        ll.work_date,
        ll.logged_at,
        u.id AS technician_id,
        u.name AS technician_name,
        u.email AS technician_email
      FROM labor_log ll
      LEFT JOIN users u ON ll.technician_id = u.id
      WHERE ll.work_order_id = $1
      ORDER BY ll.work_date ASC, ll.logged_at ASC
      `,
      [id],
    );

    const response = {
      id: workOrder.id,
      title: workOrder.title,
      description: workOrder.description,
      status: workOrder.status,
      priority: workOrder.priority,
      type: workOrder.type,
      created_at: workOrder.created_at,
      updated_at: workOrder.updated_at,
      due_date: workOrder.due_date,
      completed_at: workOrder.completed_at,
      estimated_hours: workOrder.estimated_hours,
      actual_hours: workOrder.actual_hours,
      asset: workOrder.asset_id
        ? {
            id: workOrder.asset_id,
            name: workOrder.asset_name,
            asset_tag: workOrder.asset_tag,
            model: workOrder.model,
            manufacturer: workOrder.manufacturer,
          }
        : null,
      location: workOrder.location_id
        ? {
            id: workOrder.location_id,
            name: workOrder.location_name,
            building: workOrder.building,
            floor: workOrder.floor,
            room: workOrder.room,
          }
        : null,
      requestor: workOrder.requestor_id
        ? {
            id: workOrder.requestor_id,
            name: workOrder.requestor_name,
            email: workOrder.requestor_email,
          }
        : null,
      assignments: assignmentsResult.rows.map((row) => ({
        id: row.id,
        work_order_id: row.work_order_id,
        assigned_at: row.assigned_at,
        role: row.role,
        technician: {
          id: row.technician_id,
          name: row.technician_name,
          email: row.technician_email,
          phone: row.technician_phone,
        },
      })),
      status_events: statusEventsResult.rows.map((row) => ({
        id: row.id,
        work_order_id: row.work_order_id,
        from_status: row.from_status,
        to_status: row.to_status,
        notes: row.notes,
        created_at: row.created_at,
        changed_by: row.changed_by_id
          ? {
              id: row.changed_by_id,
              name: row.changed_by_name,
              email: row.changed_by_email,
            }
          : null,
      })),
      parts_log: partsLogResult.rows.map((row) => ({
        id: row.id,
        work_order_id: row.work_order_id,
        part_number: row.part_number,
        part_name: row.part_name,
        quantity: row.quantity,
        unit_cost: row.unit_cost,
        total_cost: row.total_cost,
        notes: row.notes,
        logged_at: row.logged_at,
        logged_by: row.logged_by_id
          ? {
              id: row.logged_by_id,
              name: row.logged_by_name,
            }
          : null,
      })),
      labor_log: laborLogResult.rows.map((row) => ({
        id: row.id,
        work_order_id: row.work_order_id,
        hours: row.hours,
        description: row.description,
        work_date: row.work_date,
        logged_at: row.logged_at,
        technician: row.technician_id
          ? {
              id: row.technician_id,
              name: row.technician_name,
              email: row.technician_email,
            }
          : null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching work order:", error);
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

  const parseResult = patchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status: newStatus, notes, changed_by } = parseResult.data;

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

    const allowedTransitions = workOrderStateMachine[currentStatus];
    if (!allowedTransitions) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Unknown current status: ${currentStatus}` },
        { status: 422 },
      );
    }

    if (!allowedTransitions.includes(newStatus)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
          allowed_transitions: allowedTransitions,
        },
        { status: 422 },
      );
    }

    const completedAt =
      newStatus === "completed" ? new Date().toISOString() : null;

    const updateFields: string[] = ["status = $2", "updated_at = NOW()"];
    const updateValues: unknown[] = [id, newStatus];

    if (newStatus === "completed") {
      updateFields.push(`completed_at = $${updateValues.length + 1}`);
      updateValues.push(completedAt);
    }

    const updateQuery = `
      UPDATE work_orders
      SET ${updateFields.join(", ")}
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);
    const updatedWorkOrder = updateResult.rows[0];

    const statusEventResult = await client.query(
      `
      INSERT INTO status_events (work_order_id, from_status, to_status, notes, changed_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [id, currentStatus, newStatus, notes || null, changed_by || null],
    );

    const statusEvent = statusEventResult.rows[0];

    await client.query("COMMIT");

    return NextResponse.json({
      work_order: updatedWorkOrder,
      status_event: statusEvent,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating work order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
