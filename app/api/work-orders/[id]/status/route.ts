import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const statusUpdateSchema = z.object({
  status: z.enum([
    "open",
    "in_progress",
    "pending_parts",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = params.id;

  if (!workOrderId || isNaN(parseInt(workOrderId))) {
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

  const validationResult = statusUpdateSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: validationResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { status, notes } = validationResult.data;
  const updatedBy = session.user.email ?? session.user.name ?? "unknown";

  try {
    const workOrderCheck = await query(
      "SELECT id, status FROM work_orders WHERE id = $1",
      [workOrderId],
    );

    if (workOrderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const previousStatus = workOrderCheck.rows[0].status;

    await query("BEGIN", []);

    try {
      await query(
        "UPDATE work_orders SET status = $1, updated_at = NOW() WHERE id = $2",
        [status, workOrderId],
      );

      await query(
        `INSERT INTO status_updates (work_order_id, previous_status, new_status, updated_by, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [workOrderId, previousStatus, status, updatedBy, notes ?? null],
      );

      await query("COMMIT", []);
    } catch (innerError) {
      await query("ROLLBACK", []);
      throw innerError;
    }

    const updatedWorkOrder = await query(
      `SELECT wo.*, 
        json_agg(
          json_build_object(
            'id', su.id,
            'previous_status', su.previous_status,
            'new_status', su.new_status,
            'updated_by', su.updated_by,
            'notes', su.notes,
            'created_at', su.created_at
          ) ORDER BY su.created_at DESC
        ) FILTER (WHERE su.id IS NOT NULL) as status_history
       FROM work_orders wo
       LEFT JOIN status_updates su ON wo.id = su.work_order_id
       WHERE wo.id = $1
       GROUP BY wo.id`,
      [workOrderId],
    );

    return NextResponse.json(
      {
        message: "Status updated successfully",
        workOrder: updatedWorkOrder.rows[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating work order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = params.id;

  if (!workOrderId || isNaN(parseInt(workOrderId))) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  try {
    const result = await query(
      `SELECT su.*, wo.title as work_order_title
       FROM status_updates su
       JOIN work_orders wo ON su.work_order_id = wo.id
       WHERE su.work_order_id = $1
       ORDER BY su.created_at DESC`,
      [workOrderId],
    );

    return NextResponse.json({ statusHistory: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching status history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
