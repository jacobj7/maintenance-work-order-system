import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const laborLogSchema = z.object({
  technician_id: z.number().int().positive(),
  hours: z.number().positive(),
  hourly_rate: z.number().positive(),
  description: z.string().min(1).max(1000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const workOrderId = parseInt(params.id, 10);

  if (isNaN(workOrderId)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        ll.id,
        ll.work_order_id,
        ll.technician_id,
        ll.hours,
        ll.hourly_rate,
        ll.description,
        ll.created_at,
        ll.updated_at
       FROM labor_log ll
       WHERE ll.work_order_id = $1
       ORDER BY ll.created_at DESC`,
      [workOrderId],
    );

    return NextResponse.json({ data: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching labor logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch labor logs" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const workOrderId = parseInt(params.id, 10);

  if (isNaN(workOrderId)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = laborLogSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { technician_id, hours, hourly_rate, description } = parseResult.data;

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
      `INSERT INTO labor_log (work_order_id, technician_id, hours, hourly_rate, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, work_order_id, technician_id, hours, hourly_rate, description, created_at, updated_at`,
      [workOrderId, technician_id, hours, hourly_rate, description],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error inserting labor log:", error);
    return NextResponse.json(
      { error: "Failed to create labor log entry" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
