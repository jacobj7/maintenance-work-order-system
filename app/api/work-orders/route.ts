import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createWorkOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assetId: z.number().int().positive().optional().nullable(),
  assignedTo: z.number().int().positive().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().positive().optional().nullable(),
  initialNote: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const assetId = searchParams.get("assetId");
    const priority = searchParams.get("priority");

    const conditions: string[] = ["wo.org_id = $1"];
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`wo.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (assignedTo) {
      const assignedToNum = parseInt(assignedTo, 10);
      if (!isNaN(assignedToNum)) {
        conditions.push(`wo.assigned_to = $${paramIndex}`);
        params.push(assignedToNum);
        paramIndex++;
      }
    }

    if (assetId) {
      const assetIdNum = parseInt(assetId, 10);
      if (!isNaN(assetIdNum)) {
        conditions.push(`wo.asset_id = $${paramIndex}`);
        params.push(assetIdNum);
        paramIndex++;
      }
    }

    if (priority) {
      conditions.push(`wo.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const query = `
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
        wo.org_id,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        u.id AS assigned_user_id,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email,
        c.id AS created_by_id,
        c.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users c ON wo.created_by = c.id
      WHERE ${whereClause}
      ORDER BY wo.created_at DESC
    `;

    const result = await db.query(query, params);

    const workOrders = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      estimatedHours: row.estimated_hours,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orgId: row.org_id,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            assetTag: row.asset_tag,
          }
        : null,
      assignedTo: row.assigned_user_id
        ? {
            id: row.assigned_user_id,
            name: row.assigned_user_name,
            email: row.assigned_user_email,
          }
        : null,
      createdBy: row.created_by_id
        ? {
            id: row.created_by_id,
            name: row.created_by_name,
          }
        : null,
    }));

    return NextResponse.json({ workOrders }, { status: 200 });
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

    const orgId = (session.user as any).orgId;
    const userId = (session.user as any).id;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 403 },
      );
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
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const {
      title,
      description,
      status,
      priority,
      assetId,
      assignedTo,
      dueDate,
      estimatedHours,
      initialNote,
    } = parseResult.data;

    if (assetId) {
      const assetCheck = await db.query(
        "SELECT id FROM assets WHERE id = $1 AND org_id = $2",
        [assetId, orgId],
      );
      if (assetCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Asset not found or does not belong to your organization" },
          { status: 404 },
        );
      }
    }

    if (assignedTo) {
      const userCheck = await db.query(
        "SELECT id FROM users WHERE id = $1 AND org_id = $2",
        [assignedTo, orgId],
      );
      if (userCheck.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              "Assigned user not found or does not belong to your organization",
          },
          { status: 404 },
        );
      }
    }

    const insertWorkOrderQuery = `
      INSERT INTO work_orders (
        title,
        description,
        status,
        priority,
        asset_id,
        assigned_to,
        due_date,
        estimated_hours,
        org_id,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;

    const workOrderResult = await db.query(insertWorkOrderQuery, [
      title,
      description ?? null,
      status,
      priority,
      assetId ?? null,
      assignedTo ?? null,
      dueDate ?? null,
      estimatedHours ?? null,
      orgId,
      userId ?? null,
    ]);

    const newWorkOrder = workOrderResult.rows[0];

    if (initialNote && initialNote.trim().length > 0) {
      const insertStatusUpdateQuery = `
        INSERT INTO status_updates (
          work_order_id,
          note,
          status,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;

      await db.query(insertStatusUpdateQuery, [
        newWorkOrder.id,
        initialNote.trim(),
        status,
        userId ?? null,
      ]);
    }

    const fullWorkOrderResult = await db.query(
      `
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
        wo.org_id,
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_tag,
        u.id AS assigned_user_id,
        u.name AS assigned_user_name,
        u.email AS assigned_user_email,
        c.id AS created_by_id,
        c.name AS created_by_name
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN users u ON wo.assigned_to = u.id
      LEFT JOIN users c ON wo.created_by = c.id
      WHERE wo.id = $1
      `,
      [newWorkOrder.id],
    );

    const row = fullWorkOrderResult.rows[0];
    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.due_date,
      estimatedHours: row.estimated_hours,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      orgId: row.org_id,
      asset: row.asset_id
        ? {
            id: row.asset_id,
            name: row.asset_name,
            assetTag: row.asset_tag,
          }
        : null,
      assignedTo: row.assigned_user_id
        ? {
            id: row.assigned_user_id,
            name: row.assigned_user_name,
            email: row.assigned_user_email,
          }
        : null,
      createdBy: row.created_by_id
        ? {
            id: row.created_by_id,
            name: row.created_by_name,
          }
        : null,
    };

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error("POST /api/work-orders error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
