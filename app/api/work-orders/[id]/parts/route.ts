import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const partSchema = z.object({
  part_number: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_cost: z.number().nonnegative(),
  supplier: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = params.id;

  try {
    const result = await query(
      `SELECT p.*, 
              (p.quantity * p.unit_cost) as total_cost
       FROM parts_used p
       WHERE p.work_order_id = $1
       ORDER BY p.created_at DESC`,
      [workOrderId],
    );

    const workOrderCheck = await query(
      `SELECT id FROM work_orders WHERE id = $1`,
      [workOrderId],
    );

    if (workOrderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ parts: result.rows });
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = params.id;

  try {
    const body = await request.json();
    const validationResult = partSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const { part_number, description, quantity, unit_cost, supplier } =
      validationResult.data;

    const workOrderCheck = await query(
      `SELECT id FROM work_orders WHERE id = $1`,
      [workOrderId],
    );

    if (workOrderCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Work order not found" },
        { status: 404 },
      );
    }

    const result = await query(
      `INSERT INTO parts_used (
        work_order_id,
        part_number,
        description,
        quantity,
        unit_cost,
        supplier,
        added_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        workOrderId,
        part_number,
        description,
        quantity,
        unit_cost,
        supplier || null,
        session.user?.email,
      ],
    );

    return NextResponse.json({ part: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error adding part:", error);
    return NextResponse.json({ error: "Failed to add part" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workOrderId = params.id;

  try {
    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId");

    if (!partId) {
      return NextResponse.json(
        { error: "Part ID is required" },
        { status: 400 },
      );
    }

    const partCheck = await query(
      `SELECT id FROM parts_used WHERE id = $1 AND work_order_id = $2`,
      [partId, workOrderId],
    );

    if (partCheck.rows.length === 0) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    await query(`DELETE FROM parts_used WHERE id = $1`, [partId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting part:", error);
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 },
    );
  }
}
