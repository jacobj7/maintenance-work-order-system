import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const updateWorkOrderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  asset_id: z.number().int().positive().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().positive().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  try {
    const result = await query(
      `SELECT 
        wo.*,
        a.name as asset_name,
        a.location as asset_location,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        creator.name as created_by_name
       FROM work_orders wo
       LEFT JOIN assets a ON wo.asset_id = a.id
       LEFT JOIN users u ON wo.assigned_to = u.id
       LEFT JOIN users creator ON wo.created_by = creator.id
       WHERE wo.id = $1`,
      [workOrderId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const workOrder = result.rows[0];

    // Fetch status updates
    const statusUpdates = await query(
      `SELECT su.*, u.name as updated_by_name
       FROM status_updates su
       LEFT JOIN users u ON su.updated_by = u.id
       WHERE su.work_order_id = $1
       ORDER BY su.created_at DESC`,
      [workOrderId],
    );

    // Fetch labor entries
    const laborEntries = await query(
      `SELECT le.*, u.name as technician_name
       FROM labor_entries le
       LEFT JOIN users u ON le.technician_id = u.id
       WHERE le.work_order_id = $1
       ORDER BY le.created_at DESC`,
      [workOrderId],
    );

    // Fetch parts used
    const partsUsed = await query(
      `SELECT pu.*, p.name as part_name, p.part_number, p.unit_cost
       FROM parts_used pu
       LEFT JOIN parts p ON pu.part_id = p.id
       WHERE pu.work_order_id = $1
       ORDER BY pu.created_at DESC`,
      [workOrderId],
    );

    return NextResponse.json({
      ...workOrder,
      status_updates: statusUpdates.rows,
      labor_entries: laborEntries.rows,
      parts_used: partsUsed.rows,
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

  const validationResult = updateWorkOrderSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 },
    );
  }

  const data = validationResult.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Check if work order exists
  try {
    const existing = await query("SELECT id FROM work_orders WHERE id = $1", [
      workOrderId,
    ]);
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Error checking work order existence:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Build dynamic update query
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
  if (data.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex++}`);
    values.push(data.priority);
  }
  if (data.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.asset_id !== undefined) {
    setClauses.push(`asset_id = $${paramIndex++}`);
    values.push(data.asset_id);
  }
  if (data.due_date !== undefined) {
    setClauses.push(`due_date = $${paramIndex++}`);
    values.push(data.due_date);
  }
  if (data.estimated_hours !== undefined) {
    setClauses.push(`estimated_hours = $${paramIndex++}`);
    values.push(data.estimated_hours);
  }

  setClauses.push(`updated_at = NOW()`);

  values.push(workOrderId);

  try {
    const result = await query(
      `UPDATE work_orders SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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

  // Only managers can delete work orders
  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workOrderId = parseInt(params.id, 10);
  if (isNaN(workOrderId)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  try {
    const result = await query(
      "DELETE FROM work_orders WHERE id = $1 RETURNING id",
      [workOrderId],
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
