import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import pg from "pg";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PatchSchema = z.object({
  status: z
    .enum(["open", "in_progress", "on_hold", "completed", "cancelled"])
    .optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional(),
});

async function sendAssignmentEmail(
  assigneeEmail: string,
  assigneeName: string,
  workOrderId: string,
  workOrderTitle: string,
) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate a brief, professional email notification for a work order assignment. 
          Assignee: ${assigneeName}
          Work Order ID: ${workOrderId}
          Work Order Title: ${workOrderTitle}
          Keep it concise and actionable.`,
        },
      ],
    });

    const emailContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log(`Assignment email to ${assigneeEmail}:`, emailContent);
    return emailContent;
  } catch (error) {
    console.error("Error generating assignment email:", error);
    return null;
  }
}

async function sendCompletionEmail(
  requesterEmail: string,
  requesterName: string,
  workOrderId: string,
  workOrderTitle: string,
) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Generate a brief, professional email notification for a completed work order.
          Requester: ${requesterName}
          Work Order ID: ${workOrderId}
          Work Order Title: ${workOrderTitle}
          Keep it concise and informative.`,
        },
      ],
    });

    const emailContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log(`Completion email to ${requesterEmail}:`, emailContent);
    return emailContent;
  } catch (error) {
    console.error("Error generating completion email:", error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Work order ID is required" },
      { status: 400 },
    );
  }

  const client = await pool.connect();

  try {
    const workOrderQuery = `
      SELECT 
        wo.id,
        wo.title,
        wo.description,
        wo.status,
        wo.priority,
        wo.created_at,
        wo.updated_at,
        wo.due_date,
        a.id AS asset_id,
        a.name AS asset_name,
        a.serial_number AS asset_serial_number,
        a.model AS asset_model,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        l.building AS location_building,
        l.floor AS location_floor,
        u.id AS assignee_id,
        u.name AS assignee_name,
        u.email AS assignee_email,
        r.id AS requester_id,
        r.name AS requester_name,
        r.email AS requester_email
      FROM work_orders wo
      LEFT JOIN assets a ON wo.asset_id = a.id
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.assignee_id = u.id
      LEFT JOIN users r ON wo.requester_id = r.id
      WHERE wo.id = $1
    `;

    const statusUpdatesQuery = `
      SELECT 
        su.id,
        su.status,
        su.notes,
        su.created_at,
        u.id AS updated_by_id,
        u.name AS updated_by_name,
        u.email AS updated_by_email
      FROM status_updates su
      LEFT JOIN users u ON su.updated_by = u.id
      WHERE su.work_order_id = $1
      ORDER BY su.created_at ASC
    `;

    const [workOrderResult, statusUpdatesResult] = await Promise.all([
      client.query(workOrderQuery, [id]),
      client.query(statusUpdatesQuery, [id]),
    ]);

    if (workOrderResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const row = workOrderResult.rows[0];

    const workOrder = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
      due_date: row.due_date,
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
      assignee: row.assignee_id
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email,
          }
        : null,
      requester: row.requester_id
        ? {
            id: row.requester_id,
            name: row.requester_name,
            email: row.requester_email,
          }
        : null,
      status_updates: statusUpdatesResult.rows.map((su) => ({
        id: su.id,
        status: su.status,
        notes: su.notes,
        created_at: su.created_at,
        updated_by: su.updated_by_id
          ? {
              id: su.updated_by_id,
              name: su.updated_by_name,
              email: su.updated_by_email,
            }
          : null,
      })),
    };

    return NextResponse.json(workOrder);
  } catch (error) {
    console.error("Error fetching work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: "Work order ID is required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = PatchSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { status, assignee_id, notes } = parseResult.data;

  if (status === undefined && assignee_id === undefined) {
    return NextResponse.json(
      { error: "At least one of status or assignee_id must be provided" },
      { status: 400 },
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentWorkOrderResult = await client.query(
      `SELECT 
        wo.*,
        u.id AS assignee_id,
        u.name AS assignee_name,
        u.email AS assignee_email,
        r.id AS requester_id,
        r.name AS requester_name,
        r.email AS requester_email
      FROM work_orders wo
      LEFT JOIN users u ON wo.assignee_id = u.id
      LEFT JOIN users r ON wo.requester_id = r.id
      WHERE wo.id = $1
      FOR UPDATE`,
      [id],
    );

    if (currentWorkOrderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const currentWorkOrder = currentWorkOrderResult.rows[0];

    const updateFields: string[] = [];
    const updateValues: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    if (assignee_id !== undefined) {
      updateFields.push(`assignee_id = $${paramIndex}`);
      updateValues.push(assignee_id);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE work_orders 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedWorkOrderResult = await client.query(
      updateQuery,
      updateValues,
    );
    const updatedWorkOrder = updatedWorkOrderResult.rows[0];

    const currentUserEmail = session.user?.email;
    let currentUserId: string | null = null;

    if (currentUserEmail) {
      const userResult = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [currentUserEmail],
      );
      if (userResult.rows.length > 0) {
        currentUserId = userResult.rows[0].id;
      }
    }

    const statusUpdateResult = await client.query(
      `INSERT INTO status_updates (work_order_id, status, notes, updated_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, status || currentWorkOrder.status, notes || null, currentUserId],
    );

    await client.query("COMMIT");

    const assigneeChanged =
      assignee_id !== undefined && assignee_id !== currentWorkOrder.assignee_id;
    const statusChangedToCompleted =
      status === "completed" && currentWorkOrder.status !== "completed";

    if (assigneeChanged && assignee_id) {
      const newAssigneeResult = await pool.query(
        "SELECT id, name, email FROM users WHERE id = $1",
        [assignee_id],
      );

      if (newAssigneeResult.rows.length > 0) {
        const newAssignee = newAssigneeResult.rows[0];
        await sendAssignmentEmail(
          newAssignee.email,
          newAssignee.name,
          id,
          currentWorkOrder.title,
        );
      }
    }

    if (statusChangedToCompleted && currentWorkOrder.requester_email) {
      await sendCompletionEmail(
        currentWorkOrder.requester_email,
        currentWorkOrder.requester_name,
        id,
        currentWorkOrder.title,
      );
    }

    return NextResponse.json({
      ...updatedWorkOrder,
      status_update: statusUpdateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
