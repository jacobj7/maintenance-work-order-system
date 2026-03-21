import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

const PatchSchema = z.object({
  status: z.string().optional(),
  technician_id: z.number().int().positive().optional(),
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
        u.name AS technician_name,
        u.email AS technician_email,
        creator.name AS created_by_name,
        creator.email AS created_by_email
       FROM work_orders wo
       LEFT JOIN users u ON wo.technician_id = u.id
       LEFT JOIN users creator ON wo.created_by = creator.id
       WHERE wo.id = $1`,
      [id],
    );

    if (workOrderResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const historyResult = await client.query(
      `SELECT 
        sh.*,
        u.name AS changed_by_name,
        u.email AS changed_by_email
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by = u.id
       WHERE sh.work_order_id = $1
       ORDER BY sh.created_at ASC`,
      [id],
    );

    const workOrder = {
      ...workOrderResult.rows[0],
      status_history: historyResult.rows,
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

  const parseResult = PatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { status, technician_id, notes } = parseResult.data;

  if (!status && technician_id === undefined) {
    return NextResponse.json(
      { error: "At least one of status or technician_id must be provided" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
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
    const currentStatus: string = existing.status;

    if (status && status !== currentStatus) {
      const allowedTransitions = VALID_TRANSITIONS[currentStatus];
      if (!allowedTransitions) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: `Unknown current status: ${currentStatus}` },
          { status: 400 },
        );
      }
      if (!allowedTransitions.includes(status)) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: `Invalid status transition from '${currentStatus}' to '${status}'`,
            allowed_transitions: allowedTransitions,
          },
          { status: 422 },
        );
      }
    }

    if (technician_id !== undefined) {
      const techResult = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [technician_id],
      );
      if (techResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Technician not found" },
          { status: 404 },
        );
      }
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status && status !== currentStatus) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (technician_id !== undefined) {
      setClauses.push(`technician_id = $${paramIndex++}`);
      values.push(technician_id);
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
    const updatedWorkOrder = updateResult.rows[0];

    let newHistoryRecord = null;
    if (status && status !== currentStatus) {
      const changedById =
        (session.user as { id?: number | string } | undefined)?.id ?? null;

      const historyResult = await client.query(
        `INSERT INTO status_history (work_order_id, previous_status, new_status, changed_by, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [id, currentStatus, status, changedById, notes ?? null],
      );
      newHistoryRecord = historyResult.rows[0];
    }

    await client.query("COMMIT");

    return NextResponse.json({
      data: updatedWorkOrder,
      status_history_record: newHistoryRecord,
    });
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
