import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const assignSchema = z.object({
  assigned_to: z.string().min(1, "Assignee is required"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workOrderId = params.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationResult = assignSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validationResult.error.flatten() },
      { status: 400 },
    );
  }

  const { assigned_to } = validationResult.data;

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

    const result = await query(
      `UPDATE work_orders
       SET assigned_to = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, status, assigned_to, updated_at`,
      [assigned_to, workOrderId],
    );

    return NextResponse.json(
      {
        message: "Work order assigned successfully",
        workOrder: result.rows[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error assigning work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
