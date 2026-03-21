import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createWorkOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_id: z.number().int().positive().optional().nullable(),
  location_id: z.number().int().positive().optional().nullable(),
  assigned_to: z.number().int().positive().optional().nullable(),
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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const offset = (page - 1) * limit;

    const validStatuses = [
      "open",
      "in_progress",
      "on_hold",
      "completed",
      "cancelled",
    ];
    const validPriorities = ["low", "medium", "high", "critical"];

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status && validStatuses.includes(status)) {
      conditions.push(`wo.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (priority && validPriorities.includes(priority)) {
      conditions.push(`wo.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
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
        wo.due_date,
        wo.estimated_hours,
        wo.notes,
        wo.created_at,
        wo.updated_at,
        wo.assigned_to,
        a.id as asset_id,
        a.name as asset_name,
        a.asset_tag,
        a.type as asset_type,
        l.id as location_id,
        l.name as location_name,
        l.address as location_address
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      ${whereClause}
      ORDER BY
        CASE wo.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        wo.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, params),
        client.query(dataQuery, [...params, limit, offset]),
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      const workOrders = dataResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        due_date: row.due_date,
        estimated_hours: row.estimated_hours,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        assigned_to: row.assigned_to,
        asset: row.asset_id
          ? {
              id: row.asset_id,
              name: row.asset_name,
              asset_tag: row.asset_tag,
              type: row.asset_type,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              address: row.location_address,
            }
          : null,
      }));

      return NextResponse.json({
        data: workOrders,
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
    console.error("Error fetching work orders:", error);
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

    const validationResult = createWorkOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const data = validationResult.data;

    const insertQuery = `
      INSERT INTO work_orders (
        title,
        description,
        status,
        priority,
        asset_id,
        location_id,
        assigned_to,
        due_date,
        estimated_hours,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING
        id,
        title,
        description,
        status,
        priority,
        asset_id,
        location_id,
        assigned_to,
        due_date,
        estimated_hours,
        notes,
        created_at,
        updated_at
    `;

    const insertParams = [
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.asset_id ?? null,
      data.location_id ?? null,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      data.notes ?? null,
    ];

    const client = await pool.connect();
    try {
      const result = await client.query(insertQuery, insertParams);
      const newWorkOrder = result.rows[0];

      let asset = null;
      let location = null;

      if (newWorkOrder.asset_id) {
        const assetResult = await client.query(
          "SELECT id, name, asset_tag, type FROM assets WHERE id = $1",
          [newWorkOrder.asset_id],
        );
        if (assetResult.rows.length > 0) {
          asset = assetResult.rows[0];
        }
      }

      if (newWorkOrder.location_id) {
        const locationResult = await client.query(
          "SELECT id, name, address FROM locations WHERE id = $1",
          [newWorkOrder.location_id],
        );
        if (locationResult.rows.length > 0) {
          location = locationResult.rows[0];
        }
      }

      return NextResponse.json(
        {
          data: {
            ...newWorkOrder,
            asset,
            location,
          },
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
