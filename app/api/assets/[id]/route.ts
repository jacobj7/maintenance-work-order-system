import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  asset_tag: z.string().optional(),
  serial_number: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).optional(),
  category: z.string().optional(),
  location_id: z.number().int().positive().nullable().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.number().nonnegative().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          a.id,
          a.name,
          a.description,
          a.asset_tag,
          a.serial_number,
          a.status,
          a.category,
          a.location_id,
          a.purchase_date,
          a.purchase_price,
          a.warranty_expiry,
          a.notes,
          a.created_at,
          a.updated_at,
          l.name AS location_name,
          l.address AS location_address,
          l.city AS location_city,
          l.state AS location_state,
          l.country AS location_country
        FROM assets a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      const row = result.rows[0];
      const asset = {
        id: row.id,
        name: row.name,
        description: row.description,
        asset_tag: row.asset_tag,
        serial_number: row.serial_number,
        status: row.status,
        category: row.category,
        location_id: row.location_id,
        purchase_date: row.purchase_date,
        purchase_price: row.purchase_price,
        warranty_expiry: row.warranty_expiry,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              address: row.location_address,
              city: row.location_city,
              state: row.location_state,
              country: row.location_country,
            }
          : null,
      };

      return NextResponse.json({ asset });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid asset ID" }, { status: 400 });
    }

    const body = await request.json();
    const parseResult = patchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const data = parseResult.data;
    const fields = Object.keys(data);

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of fields) {
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(data[field as keyof typeof data]);
      paramIndex++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const client = await pool.connect();
    try {
      const checkResult = await client.query(
        "SELECT id FROM assets WHERE id = $1",
        [id],
      );
      if (checkResult.rows.length === 0) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      const updateResult = await client.query(
        `UPDATE assets SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values,
      );

      const updatedAsset = updateResult.rows[0];

      const assetWithLocation = await client.query(
        `SELECT 
          a.id,
          a.name,
          a.description,
          a.asset_tag,
          a.serial_number,
          a.status,
          a.category,
          a.location_id,
          a.purchase_date,
          a.purchase_price,
          a.warranty_expiry,
          a.notes,
          a.created_at,
          a.updated_at,
          l.name AS location_name,
          l.address AS location_address,
          l.city AS location_city,
          l.state AS location_state,
          l.country AS location_country
        FROM assets a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = $1`,
        [updatedAsset.id],
      );

      const row = assetWithLocation.rows[0];
      const asset = {
        id: row.id,
        name: row.name,
        description: row.description,
        asset_tag: row.asset_tag,
        serial_number: row.serial_number,
        status: row.status,
        category: row.category,
        location_id: row.location_id,
        purchase_date: row.purchase_date,
        purchase_price: row.purchase_price,
        warranty_expiry: row.warranty_expiry,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        location: row.location_id
          ? {
              id: row.location_id,
              name: row.location_name,
              address: row.location_address,
              city: row.location_city,
              state: row.location_state,
              country: row.location_country,
            }
          : null,
      };

      return NextResponse.json({ asset });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PATCH /api/assets/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
