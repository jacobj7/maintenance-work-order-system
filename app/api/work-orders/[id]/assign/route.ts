import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignSchema = z.object({
  technician_id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = params.id;
    if (!workOrderId) {
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

    const parseResult = assignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { technician_id } = parseResult.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Validate technician exists and has technician role
      const technicianResult = await client.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [technician_id],
      );

      if (technicianResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Technician not found" },
          { status: 404 },
        );
      }

      const technician = technicianResult.rows[0];
      if (technician.role !== "technician") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "User does not have technician role" },
          { status: 400 },
        );
      }

      // Validate work order exists
      const workOrderResult = await client.query(
        `SELECT id, status FROM work_orders WHERE id = $1`,
        [workOrderId],
      );

      if (workOrderResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const workOrder = workOrderResult.rows[0];

      // Insert into assignments table
      const assignmentResult = await client.query(
        `INSERT INTO assignments (work_order_id, technician_id, assigned_at)
         VALUES ($1, $2, NOW())
         RETURNING id, work_order_id, technician_id, assigned_at`,
        [workOrderId, technician_id],
      );

      const assignment = assignmentResult.rows[0];

      // Update work order status to 'assigned' if currently 'open'
      let updatedStatus = workOrder.status;
      if (workOrder.status === "open") {
        await client.query(
          `UPDATE work_orders SET status = 'assigned', updated_at = NOW() WHERE id = $1`,
          [workOrderId],
        );
        updatedStatus = "assigned";
      }

      // Insert status_event
      await client.query(
        `INSERT INTO status_events (work_order_id, status, created_by, created_at, metadata)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [
          workOrderId,
          updatedStatus,
          session.user.email || session.user.name || "system",
          JSON.stringify({
            technician_id,
            assignment_id: assignment.id,
            action: "assign",
          }),
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: "Technician assigned successfully",
          assignment,
          work_order_status: updatedStatus,
        },
        { status: 201 },
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error assigning technician to work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
