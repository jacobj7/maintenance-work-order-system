import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const laborEntrySchema = z.object({
  technician_id: z.string().uuid(),
  hours: z.number().positive(),
  description: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workOrderId = params.id;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          le.id,
          le.work_order_id,
          le.technician_id,
          le.hours,
          le.description,
          le.created_at,
          le.updated_at
        FROM labor_entries le
        WHERE le.work_order_id = $1
        ORDER BY le.created_at DESC`,
        [workOrderId],
      );

      return NextResponse.json({ labor_entries: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching labor entries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = laborEntrySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { technician_id, hours, description } = parseResult.data;

    const client = await pool.connect();
    try {
      const workOrderCheck = await client.query(
        "SELECT id FROM work_orders WHERE id = $1",
        [workOrderId],
      );

      if (workOrderCheck.rowCount === 0) {
        return NextResponse.json(
          { error: "Work order not found" },
          { status: 404 },
        );
      }

      const result = await client.query(
        `INSERT INTO labor_entries (work_order_id, technician_id, hours, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, work_order_id, technician_id, hours, description, created_at, updated_at`,
        [workOrderId, technician_id, hours, description],
      );

      return NextResponse.json(
        { labor_entry: result.rows[0] },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating labor entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
