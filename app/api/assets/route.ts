import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  asset_tag: z.string().min(1, "Asset tag is required").max(100),
  serial_number: z.string().optional(),
  location_id: z.number().int().positive().optional().nullable(),
  category: z.string().optional(),
  status: z
    .enum(["active", "inactive", "maintenance", "retired"])
    .default("active"),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional(),
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
        a.description,
        a.asset_tag,
        a.serial_number,
        a.location_id,
        l.name AS location_name,
        a.category,
        a.status,
        a.purchase_date,
        a.purchase_price,
        a.notes,
        a.created_at,
        a.updated_at
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
        { status: 422 },
      );
    }

    const data = parseResult.data;

    const result = await query(
      `INSERT INTO assets (
        name,
        description,
        asset_tag,
        serial_number,
        location_id,
        category,
        status,
        purchase_date,
        purchase_price,
        notes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        data.name,
        data.description ?? null,
        data.asset_tag,
        data.serial_number ?? null,
        data.location_id ?? null,
        data.category ?? null,
        data.status,
        data.purchase_date ?? null,
        data.purchase_price ?? null,
        data.notes ?? null,
      ],
    );

    const newAsset = result.rows[0];

    // Fetch with location name
    const assetWithLocation = await query(
      `SELECT 
        a.id,
        a.name,
        a.description,
        a.asset_tag,
        a.serial_number,
        a.location_id,
        l.name AS location_name,
        a.category,
        a.status,
        a.purchase_date,
        a.purchase_price,
        a.notes,
        a.created_at,
        a.updated_at
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.id = $1`,
      [newAsset.id],
    );

    return NextResponse.json(
      { asset: assetWithLocation.rows[0] },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/assets error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "23505"
    ) {
      return NextResponse.json(
        { error: "Asset tag already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
