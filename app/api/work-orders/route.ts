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
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  location_id: z.number().int().positive().optional().nullable(),
  assigned_user_id: z.number().int().positive().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
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

    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    const validPriorities = ["low", "medium", "high", "urgent"];

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 },
        );
      }
      conditions.push(`wo.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (priority) {
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: "Invalid priority value" },
          { status: 400 },
        );
      }
      conditions.push(`wo.priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.created_at,
        wo.updated_at,
        wo.location_id,
        l.name AS location_name,
        wo.assigned_user_id,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email
      FROM work_orders wo
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assigned_user_id = u.id
      ${whereClause}
      ORDER BY wo.created_at DESC
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json({
        data: result.rows,
        count: result.rowCount,
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

    const parseResult = createWorkOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const {
      title,
      description,
      status,
      priority,
      location_id,
      assigned_user_id,
      due_date,
    } = parseResult.data;

    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO work_orders (
          title,
          description,
          status,
          priority,
          location_id,
          assigned_user_id,
          due_date,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING
          id,
          title,
          description,
          status,
          priority,
          location_id,
          assigned_user_id,
          due_date,
          created_at,
          updated_at
      `;

      const insertValues = [
        title,
        description ?? null,
        status,
        priority,
        location_id ?? null,
        assigned_user_id ?? null,
        due_date ?? null,
      ];

      const insertResult = await client.query(insertQuery, insertValues);
      const newWorkOrder = insertResult.rows[0];

      const enrichQuery = `
        SELECT
          wo.id,
          wo.title,
          wo.description,
          wo.status,
          wo.priority,
          wo.due_date,
          wo.created_at,
          wo.updated_at,
          wo.location_id,
          l.name AS location_name,
          wo.assigned_user_id,
          u.name AS assigned_user_name,
          u.email AS assigned_user_email
        FROM work_orders wo
        LEFT JOIN locations l ON wo.location_id = l.id
        LEFT JOIN users u ON wo.assigned_user_id = u.id
        WHERE wo.id = $1
      `;

      const enrichResult = await client.query(enrichQuery, [newWorkOrder.id]);

      return NextResponse.json({ data: enrichResult.rows[0] }, { status: 201 });
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
