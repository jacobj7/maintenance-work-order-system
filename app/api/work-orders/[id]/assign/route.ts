import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const assignSchema = z.object({
  technician_id: z.string().uuid("technician_id must be a valid UUID"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "supervisor") {
      return NextResponse.json(
        { error: "Forbidden. Supervisor role required." },
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
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { technician_id } = parseResult.data;

    const client = await pool.connect();
    try {
      const workOrderCheck = await client.query(
        "SELECT id FROM work_orders WHERE id = $1",
        [workOrderId],
      );

      if (workOrderCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Work order not found." },
          { status: 404 },
        );
      }

      const technicianCheck = await client.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'technician'",
        [technician_id],
      );

      if (technicianCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Technician not found or user is not a technician." },
          { status: 404 },
        );
      }

      const existingAssignment = await client.query(
        "SELECT id FROM assignments WHERE work_order_id = $1 AND technician_id = $2",
        [workOrderId, technician_id],
      );

      if (existingAssignment.rowCount && existingAssignment.rowCount > 0) {
        return NextResponse.json(
          { error: "Technician is already assigned to this work order." },
          { status: 409 },
        );
      }

      const insertResult = await client.query(
        `INSERT INTO assignments (work_order_id, technician_id, assigned_by, assigned_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, work_order_id, technician_id, assigned_by, assigned_at`,
        [workOrderId, technician_id, session.user.email],
      );

      const assignment = insertResult.rows[0];

      return NextResponse.json(
        {
          message: "Technician successfully assigned to work order.",
          assignment,
        },
        { status: 201 },
      );
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
