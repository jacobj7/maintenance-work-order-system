import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  asset_tag: z.string().optional(),
  serial_number: z.string().optional(),
  category: z.string().optional(),
  status: z
    .enum(["active", "inactive", "maintenance", "retired"])
    .default("active"),
  location_id: z.number().int().positive().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          a.id,
          a.name,
          a.description,
          a.asset_tag,
          a.serial_number,
          a.category,
          a.status,
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
        ORDER BY a.created_at DESC
      `);

      return NextResponse.json({ assets: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createAssetSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const data = parseResult.data;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO assets (
          name,
          description,
          asset_tag,
          serial_number,
          category,
          status,
          location_id,
          purchase_date,
          purchase_price,
          warranty_expiry,
          notes,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        RETURNING *
        `,
        [
          data.name,
          data.description ?? null,
          data.asset_tag ?? null,
          data.serial_number ?? null,
          data.category ?? null,
          data.status,
          data.location_id ?? null,
          data.purchase_date ?? null,
          data.purchase_price ?? null,
          data.warranty_expiry ?? null,
          data.notes ?? null,
        ],
      );

      const newAsset = result.rows[0];

      if (newAsset.location_id) {
        const locationResult = await client.query(
          `SELECT id, name, address, city, state, country FROM locations WHERE id = $1`,
          [newAsset.location_id],
        );
        if (locationResult.rows.length > 0) {
          const loc = locationResult.rows[0];
          newAsset.location_name = loc.name;
          newAsset.location_address = loc.address;
          newAsset.location_city = loc.city;
          newAsset.location_state = loc.state;
          newAsset.location_country = loc.country;
        }
      }

      return NextResponse.json({ asset: newAsset }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
