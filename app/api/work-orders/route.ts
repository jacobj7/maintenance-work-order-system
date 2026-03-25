import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedTo = searchParams.get("assigned_to");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        wo.*,
        a.name as asset_name,
        a.location as asset_location,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        creator.name as created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users creator ON wo.created_by = creator.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND wo.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      queryText += ` AND wo.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    if (assignedTo) {
      queryText += ` AND wo.assigned_to = $${paramCount}`;
      params.push(parseInt(assignedTo));
      paramCount++;
    }

    // Technicians can only see their own work orders
    if (session.user.role === "technician") {
      queryText += ` AND wo.assigned_to = $${paramCount}`;
      params.push(parseInt(session.user.id));
      paramCount++;
    }

    queryText += ` ORDER BY wo.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM work_orders wo WHERE 1=1
    `;
    const countParams: (string | number)[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND wo.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (priority) {
      countQuery += ` AND wo.priority = $${countParamCount}`;
      countParams.push(priority);
      countParamCount++;
    }

    if (assignedTo) {
      countQuery += ` AND wo.assigned_to = $${countParamCount}`;
      countParams.push(parseInt(assignedTo));
      countParamCount++;
    }

    if (session.user.role === "technician") {
      countQuery += ` AND wo.assigned_to = $${countParamCount}`;
      countParams.push(parseInt(session.user.id));
      countParamCount++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      work_orders: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers and admins can create work orders
  if (session.user.role === "technician") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validationResult = createWorkOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      priority,
      asset_id,
      assigned_to,
      due_date,
      estimated_hours,
    } = validationResult.data;

    const result = await query(
      `INSERT INTO work_orders (
        title, description, priority, status, asset_id, assigned_to, 
        due_date, estimated_hours, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        title,
        description || null,
        priority,
        asset_id || null,
        assigned_to || null,
        due_date || null,
        estimated_hours || null,
        parseInt(session.user.id),
      ],
    );

    const workOrder = result.rows[0];

    // If assigned, create notification
    if (assigned_to) {
      await query(
        `INSERT INTO notifications (user_id, type, message, work_order_id, created_at)
         VALUES ($1, 'assignment', $2, $3, NOW())`,
        [
          assigned_to,
          `You have been assigned to work order: ${title}`,
          workOrder.id,
        ],
      );
    }

    return NextResponse.json({ work_order: workOrder }, { status: 201 });
  } catch (error) {
    console.error("Error creating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
