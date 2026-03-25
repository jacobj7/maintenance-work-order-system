import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const statusUpdateSchema = z.object({
  status: z.enum([
    "pending",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
  updated_by: z.string().optional(),
});

async function sendStatusChangeEmail(params: {
  requestor_email: string;
  work_order_id: string;
  old_status: string;
  new_status: string;
  notes?: string;
  work_order_title?: string;
}): Promise<void> {
  const {
    requestor_email,
    work_order_id,
    old_status,
    new_status,
    notes,
    work_order_title,
  } = params;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Generate a professional email notification for a work order status change.
          
Work Order ID: ${work_order_id}
Work Order Title: ${work_order_title || "N/A"}
Previous Status: ${old_status}
New Status: ${new_status}
Notes: ${notes || "No additional notes"}
Recipient: ${requestor_email}

Please write a concise, professional email body (no subject line needed) informing the requestor about this status change.`,
        },
      ],
    });

    const emailBody =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log(`Email notification for work order ${work_order_id}:`);
    console.log(`To: ${requestor_email}`);
    console.log(
      `Subject: Work Order ${work_order_id} Status Update: ${new_status}`,
    );
    console.log(`Body: ${emailBody}`);

    // In a real implementation, you would send the email here using a service like SendGrid, SES, etc.
    // For now, we log it and could store it in a notifications table
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO email_notifications (work_order_id, recipient_email, subject, body, sent_at, created_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          work_order_id,
          requestor_email,
          `Work Order ${work_order_id} Status Update: ${new_status}`,
          emailBody,
        ],
      );
    } catch (dbError) {
      // Table might not exist, just log
      console.log(
        "Could not store email notification (table may not exist):",
        dbError,
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error generating/sending status change email:", error);
    // Don't throw - email failure shouldn't block the status update
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = params.id;

    if (!workOrderId) {
      return NextResponse.json(
        { error: "Work order ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validationResult = statusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { status, notes, updated_by } = validationResult.data;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get current work order
      const workOrderResult = await client.query(
        `SELECT id, status, requestor_email, title FROM work_orders WHERE id = $1`,
        [workOrderId],
      );

      if (workOrderResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const workOrder = workOrderResult.rows[0];
      const oldStatus = workOrder.status;

      // Update work order status
      const updateResult = await client.query(
        `UPDATE work_orders 
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, status, requestor_email, title, updated_at`,
        [status, workOrderId],
      );

      const updatedWorkOrder = updateResult.rows[0];

      // Insert status_updates record
      await client.query(
        `INSERT INTO status_updates (work_order_id, old_status, new_status, notes, updated_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          workOrderId,
          oldStatus,
          status,
          notes || null,
          updated_by || session.user?.email || session.user?.name || "system",
        ],
      );

      await client.query("COMMIT");

      // Send email notification if requestor_email exists
      if (workOrder.requestor_email) {
        await sendStatusChangeEmail({
          requestor_email: workOrder.requestor_email,
          work_order_id: workOrderId,
          old_status: oldStatus,
          new_status: status,
          notes,
          work_order_title: workOrder.title,
        });
      }

      return NextResponse.json(
        {
          success: true,
          work_order: updatedWorkOrder,
          status_update: {
            work_order_id: workOrderId,
            old_status: oldStatus,
            new_status: status,
            notes,
            updated_by:
              updated_by ||
              session.user?.email ||
              session.user?.name ||
              "system",
          },
        },
        { status: 200 },
      );
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating work order status:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
