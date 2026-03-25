import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignSchema = z.object({
  technician_id: z.string().uuid("Invalid technician ID"),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "manager") {
      return NextResponse.json(
        { error: "Forbidden. Manager role required." },
        { status: 403 },
      );
    }

    const workOrderId = params.id;
    if (!workOrderId) {
      return NextResponse.json(
        { error: "Work order ID is required." },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parseResult = assignSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: parseResult.error.flatten(),
        },
        { status: 422 },
      );
    }

    const { technician_id, notes } = parseResult.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const workOrderCheck = await client.query(
        "SELECT id FROM work_orders WHERE id = $1",
        [workOrderId],
      );

      if (workOrderCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Work order not found." },
          { status: 404 },
        );
      }

      const technicianCheck = await client.query(
        "SELECT id FROM users WHERE id = $1 AND role = $2",
        [technician_id, "technician"],
      );

      if (technicianCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Technician not found or user is not a technician." },
          { status: 404 },
        );
      }

      const assignmentResult = await client.query(
        `INSERT INTO assignments (work_order_id, technician_id, notes, assigned_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW(), NOW())
         RETURNING id, work_order_id, technician_id, notes, assigned_at, created_at, updated_at`,
        [workOrderId, technician_id, notes ?? null],
      );

      await client.query(
        `UPDATE work_orders SET status = 'assigned', updated_at = NOW() WHERE id = $1`,
        [workOrderId],
      );

      await client.query("COMMIT");

      const assignment = assignmentResult.rows[0];

      return NextResponse.json(
        {
          message: "Technician assigned successfully.",
          assignment,
        },
        { status: 201 },
      );
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error assigning technician to work order:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
