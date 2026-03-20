import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const bodySchema = z.object({
  requesterEmail: z.string().email(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  assetId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  priority: z
    .enum(["low", "medium", "high", "urgent"])
    .optional()
    .default("medium"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { orgSlug: string } },
) {
  const { orgSlug } = params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = bodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { requesterEmail, title, description, assetId, locationId, priority } =
    parseResult.data;

  const client = await pool.connect();
  try {
    const orgResult = await client.query(
      `SELECT id FROM organizations WHERE slug = $1 LIMIT 1`,
      [orgSlug],
    );

    if (orgResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const orgId = orgResult.rows[0].id;

    const insertResult = await client.query(
      `INSERT INTO work_orders
        (organization_id, requester_email, title, description, asset_id, location_id, priority, status, created_at, updated_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'draft', NOW(), NOW())
       RETURNING id`,
      [
        orgId,
        requesterEmail,
        title,
        description,
        assetId ?? null,
        locationId ?? null,
        priority,
      ],
    );

    const workOrderId = insertResult.rows[0].id;

    return NextResponse.json({ id: workOrderId }, { status: 201 });
  } catch (err) {
    console.error("Error creating work order:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
