import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
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

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        wo.user_id,
        wo.assigned_to,
        u.name AS created_by_name,
        u.email AS created_by_email,
        t.name AS assigned_to_name,
        t.email AS assigned_to_email
      FROM work_orders wo
      LEFT JOIN users u ON wo.user_id = u.id
      LEFT JOIN users t ON wo.assigned_to = t.id
      WHERE wo.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
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

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Fetch the work order to check ownership and existence
  let workOrder: {
    id: number;
    assigned_to: number | null;
    user_id: number;
  } | null = null;

  try {
    const woResult = await query(
      `SELECT id, assigned_to, user_id FROM work_orders WHERE id = $1`,
      [id],
    );

    if (woResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    workOrder = woResult.rows[0] as {
      id: number;
      assigned_to: number | null;
      user_id: number;
    };
  } catch (error) {
    console.error("Error fetching work order for authorization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Authorization: allow admins, managers, and the assigned technician only
  const userRole = (session.user as { role?: string })?.role;
  const userId = parseInt((session.user as { id?: string })?.id ?? "0", 10);

  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const isAssignedTechnician =
    workOrder.assigned_to !== null && workOrder.assigned_to === userId;

  if (!isAdmin && !isManager && !isAssignedTechnician) {
    return NextResponse.json(
      {
        error:
          "Forbidden: only the assigned technician, managers, or admins may update this work order",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update" },
      { status: 400 },
    );
  }

  // Technicians may only update status — not reassign, reprioritize, etc.
  if (!isAdmin && !isManager && isAssignedTechnician) {
    const allowedKeys = new Set(["status"]);
    const disallowedKeys = Object.keys(data).filter((k) => !allowedKeys.has(k));
    if (disallowedKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Forbidden: technicians may only update status. Disallowed fields: ${disallowedKeys.join(", ")}`,
        },
        { status: 403 },
      );
    }
  }

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
  if (data.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex++}`);
    values.push(data.priority);
  }
  if (data.assigned_to !== undefined) {
    setClauses.push(`assigned_to = $${paramIndex++}`);
    values.push(data.assigned_to);
  }
  if (data.due_date !== undefined) {
    setClauses.push(`due_date = $${paramIndex++}`);
    values.push(data.due_date);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const result = await query(
      `UPDATE work_orders
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "manager") {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 },
    );
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await query(
      `DELETE FROM work_orders WHERE id = $1 RETURNING id`,
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
