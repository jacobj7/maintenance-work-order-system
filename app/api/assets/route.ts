import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  serial_number: z.string().min(1, "Serial number is required"),
  location_id: z
    .number()
    .int()
    .positive("Location ID must be a positive integer"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["active", "inactive", "maintenance", "retired"]),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        a.id,
        a.name,
        a.serial_number,
        a.category,
        a.status,
        a.created_at,
        a.updated_at,
        a.location_id,
        l.name AS location_name,
        l.address AS location_address
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.created_at DESC
    `);

    return NextResponse.json({ assets: result.rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();

    const parseResult = createAssetSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, serial_number, location_id, category, status } =
      parseResult.data;

    const result = await client.query(
      `INSERT INTO assets (name, serial_number, location_id, category, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [name, serial_number, location_id, category, status],
    );

    const asset = result.rows[0];

    const assetWithLocation = await client.query(
      `SELECT
        a.id,
        a.name,
        a.serial_number,
        a.category,
        a.status,
        a.created_at,
        a.updated_at,
        a.location_id,
        l.name AS location_name,
        l.address AS location_address
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.id = $1`,
      [asset.id],
    );

    return NextResponse.json(
      { asset: assetWithLocation.rows[0] },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/assets error:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An asset with this serial number already exists" },
        { status: 409 },
      );
    }

    if (error.code === "23503") {
      return NextResponse.json(
        { error: "The specified location does not exist" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
