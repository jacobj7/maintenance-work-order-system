import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_id: z.number().int().positive().optional().nullable(),
  location_id: z.number().int().positive().optional().nullable(),
  assigned_to: z.number().int().positive().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().positive().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigned_to = searchParams.get("assigned_to");
    const search = searchParams.get("search");

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

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
      params.push(parseInt(assigned_to, 10));
    }

    if (search) {
      conditions.push(
        `(wo.title ILIKE $${paramIndex} OR wo.description ILIKE $${paramIndex})`,
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.estimated_hours,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        u.id AS assigned_user_id,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email,
        creator.id AS created_by_id,
        creator.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      ${whereClause}
      ORDER BY
        CASE wo.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        wo.created_at DESC
    `;

    const result = await query(sql, params);

    const workOrders = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      estimated_hours: row.estimated_hours,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            asset_tag: row.asset_tag,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
          }
        : null,
      assigned_to: row.assigned_user_id
        ? {
            id: row.assigned_user_id,
            name: row.assigned_user_name,
            email: row.assigned_user_email,
          }
        : null,
      created_by: row.created_by_id
        ? {
            id: row.created_by_id,
            name: row.created_by_name,
          }
        : null,
    }));

    return NextResponse.json({
      work_orders: workOrders,
      total: workOrders.length,
    });
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createWorkOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;
    const userId = (session.user as { id?: number | string }).id;

    const insertWorkOrderSql = `
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
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const workOrderResult = await query(insertWorkOrderSql, [
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.asset_id ?? null,
      data.location_id ?? null,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      userId ?? null,
    ]);

    const newWorkOrder = workOrderResult.rows[0];

    const insertStatusHistorySql = `
      INSERT INTO status_history (
        work_order_id,
        status,
        changed_by,
        changed_at,
        notes
      ) VALUES ($1, $2, $3, NOW(), $4)
      RETURNING *
    `;

    await query(insertStatusHistorySql, [
      newWorkOrder.id,
      data.status,
      userId ?? null,
      "Work order created",
    ]);

    const fetchWorkOrderSql = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.estimated_hours,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        u.id AS assigned_user_id,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email,
        creator.id AS created_by_id,
        creator.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      WHERE wo.id = $1
    `;

    const fetchResult = await query(fetchWorkOrderSql, [newWorkOrder.id]);
    const row = fetchResult.rows[0];

    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      estimated_hours: row.estimated_hours,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            asset_tag: row.asset_tag,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
          }
        : null,
      assigned_to: row.assigned_user_id
        ? {
            id: row.assigned_user_id,
            name: row.assigned_user_name,
            email: row.assigned_user_email,
          }
        : null,
      created_by: row.created_by_id
        ? {
            id: row.created_by_id,
            name: row.created_by_name,
          }
        : null,
    };

    return NextResponse.json({ work_order: workOrder }, { status: 201 });
  } catch (error) {
    console.error("POST /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
