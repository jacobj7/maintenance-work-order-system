import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const WorkOrderCreateSchema = z.object({
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
  notes: z.string().optional().nullable(),
});

const QueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  location_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sort_by: z
    .enum(["created_at", "updated_at", "due_date", "priority", "status"])
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    const parseResult = QueryParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const params = parseResult.data;
    const offset = (params.page - 1) * params.limit;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.status) {
      conditions.push(`wo.status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.priority) {
      conditions.push(`wo.priority = $${paramIndex++}`);
      values.push(params.priority);
    }

    if (params.assigned_to) {
      conditions.push(`wo.assigned_to = $${paramIndex++}`);
      values.push(params.assigned_to);
    }

    if (params.location_id) {
      conditions.push(`wo.location_id = $${paramIndex++}`);
      values.push(params.location_id);
    }

    if (params.search) {
      conditions.push(
        `(wo.title ILIKE $${paramIndex} OR wo.description ILIKE $${paramIndex})`,
      );
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const allowedSortColumns: Record<string, string> = {
      created_at: "wo.created_at",
      updated_at: "wo.updated_at",
      due_date: "wo.due_date",
      priority: "wo.priority",
      status: "wo.status",
    };

    const sortColumn = allowedSortColumns[params.sort_by] || "wo.created_at";
    const sortOrder =
      params.sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_orders wo
      ${whereClause}
    `;

    const countResult = await query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const dataQuery = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.estimated_hours,
        wo.actual_hours,
        wo.notes,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        a.serial_number AS asset_serial,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        requester.id AS requester_id,
        requester.name AS requester_name,
        requester.email AS requester_email,
        assignee.id AS assignee_id,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users requester ON wo.requester_id = requester.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataValues = [...values, params.limit, offset];
    const dataResult = await query(dataQuery, dataValues);

    const workOrders = dataResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      estimated_hours: row.estimated_hours,
      actual_hours: row.actual_hours,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            asset_tag: row.asset_tag,
            serial_number: row.asset_serial,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
          }
        : null,
      requester: row.requester_id
        ? {
            id: row.requester_id,
            name: row.requester_name,
            email: row.requester_email,
          }
        : null,
      assignee: row.assignee_id
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email,
          }
        : null,
    }));

    const totalPages = Math.ceil(total / params.limit);

    return NextResponse.json({
      data: workOrders,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        total_pages: totalPages,
        has_next: params.page < totalPages,
        has_prev: params.page > 1,
      },
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

    const parseResult = WorkOrderCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const data = parseResult.data;
    const requesterId = (session.user as { id?: number | string }).id;

    const insertQuery = `
      INSERT INTO work_orders (
        title,
        description,
        status,
        priority,
        asset_id,
        location_id,
        requester_id,
        assigned_to,
        due_date,
        estimated_hours,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        NOW(), NOW()
      )
      RETURNING id
    `;

    const insertValues = [
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.asset_id ?? null,
      data.location_id ?? null,
      requesterId ?? null,
      data.assigned_to ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      data.notes ?? null,
    ];

    const insertResult = await query(insertQuery, insertValues);
    const newId = insertResult.rows[0]?.id;

    if (!newId) {
      throw new Error("Failed to retrieve new work order ID after insert");
    }

    const fetchQuery = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.estimated_hours,
        wo.actual_hours,
        wo.notes,
        wo.created_at,
        wo.updated_at,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        a.serial_number AS asset_serial,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        requester.id AS requester_id,
        requester.name AS requester_name,
        requester.email AS requester_email,
        assignee.id AS assignee_id,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users requester ON wo.requester_id = requester.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      WHERE wo.id = $1
    `;

    const fetchResult = await query(fetchQuery, [newId]);
    const row = fetchResult.rows[0];

    if (!row) {
      throw new Error("Failed to fetch newly created work order");
    }

    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_date: row.due_date,
      estimated_hours: row.estimated_hours,
      actual_hours: row.actual_hours,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            asset_tag: row.asset_tag,
            serial_number: row.asset_serial,
          }
        : null,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
          }
        : null,
      requester: row.requester_id
        ? {
            id: row.requester_id,
            name: row.requester_name,
            email: row.requester_email,
          }
        : null,
      assignee: row.assignee_id
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email,
          }
        : null,
    };

    return NextResponse.json({ data: workOrder }, { status: 201 });
  } catch (error) {
    console.error("POST /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
