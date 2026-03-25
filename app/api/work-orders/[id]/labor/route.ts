import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const laborSchema = z.object({
  technician_id: z.number().int().positive(),
  hours_worked: z.number().positive(),
  labor_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  hourly_rate: z.number().positive().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = parseInt(params.id, 10);
  if (isNaN(workOrderId)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  try {
    const result = await query(
      `SELECT 
        l.*,
        u.name as technician_name,
        u.email as technician_email
       FROM labor_entries l
       LEFT JOIN users u ON l.technician_id = u.id
       WHERE l.work_order_id = $1
       ORDER BY l.labor_date DESC, l.created_at DESC`,
      [workOrderId],
    );

    return NextResponse.json({ labor: result.rows });
  } catch (error) {
    console.error("Error fetching labor entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch labor entries" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const validationResult = laborSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 },
    );
  }

  const { technician_id, hours_worked, labor_date, description, hourly_rate } =
    validationResult.data;

  try {
    const workOrderCheck = await query(
      "SELECT id FROM work_orders WHERE id = $1",
      [workOrderId],
    );
    if (workOrderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const techCheck = await query("SELECT id FROM users WHERE id = $1", [
      technician_id,
    ]);
    if (techCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Technician not found" },
        { status: 404 },
      );
    }

    const result = await query(
      `INSERT INTO labor_entries 
        (work_order_id, technician_id, hours_worked, labor_date, description, hourly_rate, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        workOrderId,
        technician_id,
        hours_worked,
        labor_date,
        description ?? null,
        hourly_rate ?? null,
        session.user.email,
      ],
    );

    return NextResponse.json({ labor: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating labor entry:", error);
    return NextResponse.json(
      { error: "Failed to create labor entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = parseInt(params.id, 10);
  if (isNaN(workOrderId)) {
    return NextResponse.json(
      { error: "Invalid work order ID" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const laborId = searchParams.get("labor_id");

  if (!laborId) {
    return NextResponse.json(
      { error: "labor_id query parameter is required" },
      { status: 400 },
    );
  }

  const laborIdInt = parseInt(laborId, 10);
  if (isNaN(laborIdInt)) {
    return NextResponse.json({ error: "Invalid labor_id" }, { status: 400 });
  }

  try {
    const result = await query(
      `DELETE FROM labor_entries 
       WHERE id = $1 AND work_order_id = $2
       RETURNING *`,
      [laborIdInt, workOrderId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Labor entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Labor entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting labor entry:", error);
    return NextResponse.json(
      { error: "Failed to delete labor entry" },
      { status: 500 },
    );
  }
}
