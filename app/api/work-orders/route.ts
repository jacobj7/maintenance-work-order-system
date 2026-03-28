import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  asset_id: z.number().int().positive().optional().nullable(),
  location_id: z.number().int().positive().optional().nullable(),
  facility_id: z.number().int().positive(),
  assigned_to: z.number().int().positive().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().positive().optional().nullable(),
  work_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const facility_id = searchParams.get("facility_id");

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

    if (facility_id) {
      conditions.push(`wo.facility_id = $${paramIndex++}`);
      params.push(parseInt(facility_id, 10));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        wo.facility_id,
        wo.asset_id,
        wo.location_id,
        wo.assigned_to,
        wo.due_date,
        wo.estimated_hours,
        wo.work_type,
        wo.notes,
        wo.created_at,
        wo.updated_at,
        a.name AS asset_name,
        a.asset_tag,
        a.model AS asset_model,
        l.name AS location_name,
        l.building AS location_building,
        l.floor AS location_floor,
        l.room AS location_room
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
          ELSE 5
        END,
        wo.created_at DESC
    `;

    const result = await query(sql, params);

    return NextResponse.json({
      work_orders: result.rows,
      total: result.rowCount,
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createWorkOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const data = parseResult.data;

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
        due_date,
        estimated_hours,
        work_type,
        notes,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      )
      RETURNING *
    `;

    const workOrderResult = await query(insertWorkOrderSql, [
      data.title,
      data.description ?? null,
      data.priority,
      data.status,
      data.asset_id ?? null,
      data.location_id ?? null,
      data.facility_id,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      data.work_type ?? null,
      data.notes ?? null,
      (session.user as { id?: string | number }).id ?? null,
    ]);

    const workOrder = workOrderResult.rows[0];

    const insertStatusHistorySql = `
      INSERT INTO status_history (
        work_order_id,
        status,
        changed_by,
        changed_at,
        notes
      ) VALUES (
        $1, $2, $3, NOW(), $4
      )
      RETURNING *
    `;

    const statusHistoryResult = await query(insertStatusHistorySql, [
      workOrder.id,
      data.status,
      (session.user as { id?: string | number }).id ?? null,
      "Work order created",
    ]);

    return NextResponse.json(
      {
        work_order: workOrder,
        status_history: statusHistoryResult.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
