import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

const publicWorkOrderSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  location_id: z.string().uuid("Invalid location ID").optional().nullable(),
  asset_id: z.string().uuid("Invalid asset ID").optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  requester_name: z.string().min(1, "Requester name is required").max(255),
  requester_email: z.string().email("Invalid email address"),
  requester_phone: z.string().max(50).optional().nullable(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = publicWorkOrderSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const {
    title,
    description,
    location_id,
    asset_id,
    priority,
    requester_name,
    requester_email,
    requester_phone,
  } = parseResult.data;

  const client = await (await import("@/lib/db")).getClient();

  try {
    await client.query("BEGIN");

    const insertWorkOrderSql = `
      INSERT INTO work_orders (
        title,
        description,
        status,
        priority,
        location_id,
        asset_id,
        requester_name,
        requester_email,
        requester_phone,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, 'open', $3, $4, $5, $6, $7, $8,
        NOW(), NOW()
      )
      RETURNING
        id,
        title,
        description,
        status,
        priority,
        location_id,
        asset_id,
        requester_name,
        requester_email,
        requester_phone,
        created_at,
        updated_at
    `;

    const workOrderResult = await client.query(insertWorkOrderSql, [
      title,
      description,
      priority,
      location_id ?? null,
      asset_id ?? null,
      requester_name,
      requester_email,
      requester_phone ?? null,
    ]);

    if (!workOrderResult.rows || workOrderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Failed to create work order" },
        { status: 500 },
      );
    }

    const workOrder = workOrderResult.rows[0];

    const insertStatusHistorySql = `
      INSERT INTO status_history (
        work_order_id,
        old_status,
        new_status,
        changed_by,
        comment,
        created_at
      ) VALUES (
        $1, NULL, 'open', NULL, $2, NOW()
      )
      RETURNING id
    `;

    await client.query(insertStatusHistorySql, [
      workOrder.id,
      "Work order submitted via public request portal",
    ]);

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: "Work order submitted successfully",
        workOrder: {
          id: workOrder.id,
          title: workOrder.title,
          description: workOrder.description,
          status: workOrder.status,
          priority: workOrder.priority,
          location_id: workOrder.location_id,
          asset_id: workOrder.asset_id,
          requester_name: workOrder.requester_name,
          requester_email: workOrder.requester_email,
          requester_phone: workOrder.requester_phone,
          created_at: workOrder.created_at,
          updated_at: workOrder.updated_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating public work order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
