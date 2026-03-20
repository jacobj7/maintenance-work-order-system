import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const patchSchema = z
  .object({
    status: z
      .enum(["open", "in_progress", "completed", "cancelled"])
      .optional(),
    assignee_id: z.string().uuid().optional(),
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

async function getOrgId(userId: string): Promise<string | null> {
  const result = await query(
    "SELECT organization_id FROM users WHERE id = $1",
    [userId],
  );
  return result.rows[0]?.organization_id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 403 },
      );
    }

    const result = await query(
      `SELECT wo.*
       FROM work_orders wo
       JOIN users u ON u.id = $2 AND u.organization_id = wo.organization_id
       WHERE wo.id = $1
         AND wo.organization_id = $3`,
      [params.id, session.user.id, orgId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
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
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const data = parsed.data;
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(data.status);
      paramIndex++;
    }

    if (data.assignee_id !== undefined) {
      updateFields.push(`assignee_id = $${paramIndex}`);
      updateValues.push(data.assignee_id);
      paramIndex++;
    }

    if (data.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(data.title);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(data.description);
      paramIndex++;
    }

    if (data.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      updateValues.push(data.priority);
      paramIndex++;
    }

    // NOW() does NOT consume a parameter slot — add after incrementing real params
    updateFields.push("updated_at = NOW()");

    // paramIndex now correctly reflects the count of value parameters pushed so far
    // id goes at paramIndex, orgId at paramIndex+1
    const idPlaceholder = `$${paramIndex}`;
    const orgPlaceholder = `$${paramIndex + 1}`;
    updateValues.push(params.id);
    updateValues.push(orgId);

    const sql = `
      UPDATE work_orders
      SET ${updateFields.join(", ")}
      WHERE id = ${idPlaceholder}
        AND organization_id = ${orgPlaceholder}
      RETURNING *
    `;

    const result = await query(sql, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("PATCH /api/work-orders/[id] error:", error);
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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 403 },
      );
    }

    const result = await query(
      `DELETE FROM work_orders
       WHERE id = $1
         AND organization_id = $2
       RETURNING id`,
      [params.id, orgId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error("DELETE /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
