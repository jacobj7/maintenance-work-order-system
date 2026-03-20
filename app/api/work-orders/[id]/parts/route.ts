import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const partsLogSchema = z.object({
  part_name: z.string().min(1, "Part name is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unit_cost: z.number().positive("Unit cost must be a positive number"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const workOrderId = params.id;

  if (!workOrderId) {
    return NextResponse.json(
      { error: "Work order ID is required" },
      { status: 400 },
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM parts_log WHERE work_order_id = $1 ORDER BY created_at DESC`,
      [workOrderId],
    );

    return NextResponse.json({ parts: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching parts log:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts log entries" },
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

  const parseResult = partsLogSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { part_name, quantity, unit_cost } = parseResult.data;

  const client = await pool.connect();
  try {
    const workOrderCheck = await client.query(
      `SELECT id FROM work_orders WHERE id = $1`,
      [workOrderId],
    );

    if (workOrderCheck.rowCount === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const result = await client.query(
      `INSERT INTO parts_log (work_order_id, part_name, quantity, unit_cost, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [workOrderId, part_name, quantity, unit_cost],
    );

    return NextResponse.json({ part: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error inserting parts log entry:", error);
    return NextResponse.json(
      { error: "Failed to insert parts log entry" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
