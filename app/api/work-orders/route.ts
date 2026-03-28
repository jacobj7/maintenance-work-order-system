import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  asset_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  facility_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const facility_id = searchParams.get("facility_id");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigned_to = searchParams.get("assigned_to");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (facility_id) {
    conditions.push(`wo.facility_id = $${paramIndex++}`);
    params.push(facility_id);
  }
  if (status) {
    conditions.push(`wo.status = $${paramIndex++}`);
    params.push(status);
  }
  if (priority) {
    conditions.push(`wo.priority = $${paramIndex++}`);
    params.push(priority);
  }
  if (assigned_to) {
    conditions.push(`wo.assigned_to = $${paramIndex++}`);
    params.push(assigned_to);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      wo.*,
      u_assigned.name AS assigned_to_name,
      u_created.name AS created_by_name,
      a.name AS asset_name,
      l.name AS location_name,
      f.name AS facility_name
    FROM work_orders wo
    LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
    LEFT JOIN users u_created ON wo.created_by = u_created.id
    LEFT JOIN assets a ON wo.asset_id = a.id
    LEFT JOIN locations l ON wo.location_id = l.id
    LEFT JOIN facilities f ON wo.facility_id = f.id
    ${whereClause}
    ORDER BY wo.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;
  params.push(limit, offset);

  const countSql = `
    SELECT COUNT(*) FROM work_orders wo
    ${whereClause}
  `;

  const [result, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, params.length - 2)),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);

  return NextResponse.json({
    work_orders: result.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  let createdById: string | null = null;
  let isPublicRequest = false;

  if (!session?.user) {
    // Allow unauthenticated public requests
    isPublicRequest = true;
  } else {
    const userResult = await query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [session.user.email],
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    createdById = userResult.rows[0].id;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertWorkOrderSql = `
      INSERT INTO work_orders (
        title,
        description,
        priority,
        status,
        asset_id,
        location_id,
        facility_id,
        assigned_to,
        created_by,
        due_date,
        estimated_hours,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, 'open', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING *
    `;

    const workOrderValues = [
      data.title,
      data.description ?? null,
      data.priority,
      data.asset_id ?? null,
      data.location_id ?? null,
      data.facility_id,
      data.assigned_to ?? null,
      createdById,
      data.due_date ?? null,
      data.estimated_hours ?? null,
    ];

    const workOrderResult = await client.query(
      insertWorkOrderSql,
      workOrderValues,
    );
    const workOrder = workOrderResult.rows[0];

    const insertStatusHistorySql = `
      INSERT INTO status_history (
        work_order_id,
        new_status,
        changed_by,
        comment,
        created_at
      ) VALUES (
        $1, $2, $3, $4, NOW()
      )
      RETURNING *
    `;

    const statusHistoryValues = [
      workOrder.id,
      "open",
      createdById,
      isPublicRequest
        ? "Work order created via public request portal"
        : "Work order created",
    ];

    await client.query(insertStatusHistorySql, statusHistoryValues);

    await client.query("COMMIT");

    return NextResponse.json({ work_order: workOrder }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating work order:", error);
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
