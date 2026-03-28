import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  serial_number: z.string().min(1, "Serial number is required").max(255),
  location_id: z
    .number()
    .int()
    .positive("Location ID must be a positive integer"),
  category: z.string().min(1, "Category is required").max(255),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        a.id,
        a.name,
        a.serial_number,
        a.category,
        a.created_at,
        a.updated_at,
        a.location_id,
        l.name AS location_name,
        l.address AS location_address,
        l.city AS location_city,
        l.country AS location_country
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.created_at DESC`,
      [],
    );

    return NextResponse.json({ assets: result.rows }, { status: 200 });
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
    const session = await getServerSession(authOptions);
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
        { status: 400 },
      );
    }

    const { name, serial_number, location_id, category } = parseResult.data;

    // Check if serial_number already exists
    const existing = await query(
      "SELECT id FROM assets WHERE serial_number = $1",
      [serial_number],
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "An asset with this serial number already exists" },
        { status: 409 },
      );
    }

    // Check if location exists
    const locationCheck = await query(
      "SELECT id FROM locations WHERE id = $1",
      [location_id],
    );
    if (locationCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const insertResult = await query(
      `INSERT INTO assets (name, serial_number, location_id, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING 
         id,
         name,
         serial_number,
         location_id,
         category,
         created_at,
         updated_at`,
      [name, serial_number, location_id, category],
    );

    const newAsset = insertResult.rows[0];

    // Fetch with location join
    const assetWithLocation = await query(
      `SELECT 
        a.id,
        a.name,
        a.serial_number,
        a.category,
        a.created_at,
        a.updated_at,
        a.location_id,
        l.name AS location_name,
        l.address AS location_address,
        l.city AS location_city,
        l.country AS location_country
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.id = $1`,
      [newAsset.id],
    );

    return NextResponse.json(
      { asset: assetWithLocation.rows[0] },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
