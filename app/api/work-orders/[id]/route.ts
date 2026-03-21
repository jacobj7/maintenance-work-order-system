import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .optional(),
  assigned_to: z.number().int().nullable().optional(),
  completion_notes: z.string().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
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

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
          wo.id,
          wo.title,
          wo.description,
          wo.status,
          wo.priority,
          wo.created_at,
          wo.updated_at,
          wo.completed_at,
          wo.completion_notes,
          wo.due_date,
          creator.id AS creator_id,
          creator.name AS creator_name,
          creator.email AS creator_email,
          assignee.id AS assignee_id,
          assignee.name AS assignee_name,
          assignee.email AS assignee_email,
          asset.id AS asset_id,
          asset.name AS asset_name,
          asset.location AS asset_location,
          cat.id AS category_id,
          cat.name AS category_name
        FROM work_orders wo
        LEFT JOIN users creator ON wo.created_by = creator.id
        LEFT JOIN users assignee ON wo.assigned_to = assignee.id
        LEFT JOIN assets asset ON wo.asset_id = asset.id
        LEFT JOIN categories cat ON wo.category_id = cat.id
        WHERE wo.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const row = result.rows[0];
      const workOrder = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at,
        completion_notes: row.completion_notes,
        due_date: row.due_date,
        creator: row.creator_id
          ? {
              id: row.creator_id,
              name: row.creator_name,
              email: row.creator_email,
            }
          : null,
        assignee: row.assignee_id
          ? {
              id: row.assignee_id,
              name: row.assignee_name,
              email: row.assignee_email,
            }
          : null,
        asset: row.asset_id
          ? {
              id: row.asset_id,
              name: row.asset_name,
              location: row.asset_location,
            }
          : null,
        category: row.category_id
          ? {
              id: row.category_id,
              name: row.category_name,
            }
          : null,
      };

      return NextResponse.json(workOrder);
    } finally {
      client.release();
    }
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
        { status: 422 },
      );
    }

    const data = parseResult.data;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 },
      );
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.assigned_to !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(data.assigned_to);
    }

    if (data.completion_notes !== undefined) {
      setClauses.push(`completion_notes = $${paramIndex++}`);
      values.push(data.completion_notes);
    }

    if (data.completed_at !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      values.push(data.completed_at);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const client = await pool.connect();
    try {
      const checkResult = await client.query(
        "SELECT id FROM work_orders WHERE id = $1",
        [id],
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const updateResult = await client.query(
        `UPDATE work_orders
         SET ${setClauses.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING
           id,
           title,
           description,
           status,
           priority,
           created_at,
           updated_at,
           completed_at,
           completion_notes,
           due_date,
           created_by,
           assigned_to,
           asset_id,
           category_id`,
        values,
      );

      return NextResponse.json(updateResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PATCH /api/work-orders/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
