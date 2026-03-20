import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const workOrderQuerySchema = z.object({
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  asset_id: z.string().uuid().optional(),
  requestor_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  requestor_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const parsed = workOrderQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, priority, asset_id, requestor_id, page, limit } =
      parsed.data;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`wo.status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      conditions.push(`wo.priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (asset_id) {
      conditions.push(`wo.asset_id = $${paramIndex++}`);
      values.push(asset_id);
    }
    if (requestor_id) {
      conditions.push(`wo.requestor_id = $${paramIndex++}`);
      values.push(requestor_id);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_orders wo
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.asset_id,
        wo.location_id,
        wo.requestor_id,
        wo.assignee_id,
        wo.due_date,
        wo.estimated_hours,
        wo.notes,
        wo.created_at,
        wo.updated_at,
        a.name as asset_name,
        a.asset_tag,
        a.type as asset_type,
        l.name as location_name,
        l.address as location_address
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      ${whereClause}
      ORDER BY wo.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countValues = [...values];
    const dataValues = [...values, limit, offset];

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createWorkOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      status,
      priority,
      asset_id,
      location_id,
      requestor_id,
      assignee_id,
      due_date,
      estimated_hours,
      notes,
    } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertWorkOrderQuery = `
        INSERT INTO work_orders (
          title,
          description,
          status,
          priority,
          asset_id,
          location_id,
          requestor_id,
          assignee_id,
          due_date,
          estimated_hours,
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          NOW(), NOW()
        )
        RETURNING *
      `;

      const workOrderResult = await client.query(insertWorkOrderQuery, [
        title,
        description ?? null,
        status,
        priority,
        asset_id ?? null,
        location_id ?? null,
        requestor_id ?? null,
        assignee_id ?? null,
        due_date ?? null,
        estimated_hours ?? null,
        notes ?? null,
      ]);

      const workOrder = workOrderResult.rows[0];

      const insertStatusEventQuery = `
        INSERT INTO status_events (
          work_order_id,
          from_status,
          to_status,
          changed_by,
          changed_at,
          created_at
        ) VALUES (
          $1, $2, $3, $4, NOW(), NOW()
        )
        RETURNING *
      `;

      const changedBy =
        (session.user as { id?: string } | undefined)?.id ?? null;

      const statusEventResult = await client.query(insertStatusEventQuery, [
        workOrder.id,
        null,
        "open",
        changedBy,
      ]);

      await client.query("COMMIT");

      return NextResponse.json(
        {
          data: workOrder,
          statusEvent: statusEventResult.rows[0],
        },
        { status: 201 },
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
