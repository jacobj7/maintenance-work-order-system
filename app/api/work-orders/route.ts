import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const workOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(["open", "in_progress", "completed", "cancelled", "on_hold"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  asset_id: z.coerce.number().int().positive().optional(),
  location_id: z.coerce.number().int().positive().optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  search: z.string().max(255).optional(),
  sort_by: z
    .enum(["created_at", "updated_at", "due_date", "priority", "status"])
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

const createWorkOrderSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "completed", "cancelled", "on_hold"])
    .default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  asset_id: z.number().int().positive().optional().nullable(),
  location_id: z.number().int().positive().optional().nullable(),
  assigned_to: z.number().int().positive().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().positive().optional().nullable(),
  requestor_name: z.string().max(255).optional().nullable(),
  requestor_email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

async function sendConfirmationEmail(
  email: string,
  workOrder: {
    id: number;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  },
) {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate a professional work order confirmation email for the following details:
          
Work Order ID: ${workOrder.id}
Title: ${workOrder.title}
Status: ${workOrder.status}
Priority: ${workOrder.priority}
Created At: ${workOrder.created_at}
Recipient Email: ${email}

Please write a concise, professional confirmation email body (no subject line needed). Include the work order details and let them know they will be notified of any updates.`,
        },
      ],
    });

    const emailBody =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log(`Confirmation email would be sent to ${email}:`);
    console.log(
      `Subject: Work Order #${workOrder.id} Confirmation - ${workOrder.title}`,
    );
    console.log(`Body: ${emailBody}`);

    return { success: true, emailBody };
  } catch (error) {
    console.error("Failed to generate/send confirmation email:", error);
    return { success: false, error: String(error) };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validationResult = workOrderQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      status,
      priority,
      asset_id,
      location_id,
      assigned_to,
      search,
      sort_by,
      sort_order,
    } = validationResult.data;

    const offset = (page - 1) * limit;
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

    if (asset_id) {
      conditions.push(`wo.asset_id = $${paramIndex++}`);
      params.push(asset_id);
    }

    if (location_id) {
      conditions.push(`wo.location_id = $${paramIndex++}`);
      params.push(location_id);
    }

    if (assigned_to) {
      conditions.push(`wo.assigned_to = $${paramIndex++}`);
      params.push(assigned_to);
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

    const allowedSortColumns: Record<string, string> = {
      created_at: "wo.created_at",
      updated_at: "wo.updated_at",
      due_date: "wo.due_date",
      priority: "wo.priority",
      status: "wo.status",
    };

    const sortColumn = allowedSortColumns[sort_by] || "wo.created_at";
    const sortDirection = sort_order === "asc" ? "ASC" : "DESC";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
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
        wo.actual_hours,
        wo.requestor_name,
        wo.requestor_email,
        wo.notes,
        wo.tags,
        wo.created_at,
        wo.updated_at,
        wo.assigned_to,
        a.id as asset_id,
        a.name as asset_name,
        a.serial_number as asset_serial_number,
        a.model as asset_model,
        l.id as location_id,
        l.name as location_name,
        l.address as location_address,
        l.building as location_building,
        l.floor as location_floor
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...params, limit, offset];

    const client = await pool.connect();
    try {
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, params),
        client.query(dataQuery, dataParams),
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
        actual_hours: row.actual_hours,
        requestor_name: row.requestor_name,
        requestor_email: row.requestor_email,
        notes: row.notes,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
        assigned_to: row.assigned_to,
        asset: row.asset_id
          ? {
              id: row.asset_id,
              name: row.asset_name,
              serial_number: row.asset_serial_number,
              model: row.asset_model,
            }
          : null,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              address: row.location_address,
              building: row.location_building,
              floor: row.location_floor,
            }
          : null,
      }));

      return NextResponse.json({
        data: workOrders,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
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

    const client = await pool.connect();
    try {
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
          requestor_name,
          requestor_email,
          notes,
          tags,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          NOW(), NOW()
        )
        RETURNING *
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
        data.requestor_name ?? null,
        data.requestor_email ?? null,
        data.notes ?? null,
        data.tags ? JSON.stringify(data.tags) : null,
      ];

      const result = await client.query(insertQuery, insertParams);
      const newWorkOrder = result.rows[0];

      let emailResult = null;
      if (data.requestor_email) {
        emailResult = await sendConfirmationEmail(data.requestor_email, {
          id: newWorkOrder.id,
          title: newWorkOrder.title,
          status: newWorkOrder.status,
          priority: newWorkOrder.priority,
          created_at: newWorkOrder.created_at,
        });
      }

      let assetData = null;
      let locationData = null;

      if (newWorkOrder.asset_id) {
        const assetResult = await client.query(
          "SELECT id, name, serial_number, model FROM assets WHERE id = $1",
          [newWorkOrder.asset_id],
        );
        if (assetResult.rows.length > 0) {
          assetData = assetResult.rows[0];
        }
      }

      if (newWorkOrder.location_id) {
        const locationResult = await client.query(
          "SELECT id, name, address, building, floor FROM locations WHERE id = $1",
          [newWorkOrder.location_id],
        );
        if (locationResult.rows.length > 0) {
          locationData = locationResult.rows[0];
        }
      }

      return NextResponse.json(
        {
          data: {
            ...newWorkOrder,
            asset: assetData,
            location: locationData,
          },
          email_sent: emailResult?.success ?? false,
        },
        { status: 201 },
      );
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
