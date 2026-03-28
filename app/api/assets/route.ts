import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  asset_tag: z.string().min(1).max(100),
  facility_id: z.string().uuid(),
  location_id: z.string().uuid().optional(),
  category: z.string().min(1).max(100),
  status: z
    .enum(["active", "inactive", "maintenance", "retired"])
    .default("active"),
  manufacturer: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  serial_number: z.string().max(255).optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().positive().optional(),
  warranty_expiry: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facility_id");
    const locationId = searchParams.get("location_id");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = `
      SELECT 
        a.*,
        f.name as facility_name,
        l.name as location_name
      FROM assets a
      LEFT JOIN facilities f ON a.facility_id = f.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (facilityId) {
      sql += ` AND a.facility_id = $${paramIndex++}`;
      params.push(facilityId);
    }

    if (locationId) {
      sql += ` AND a.location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (category) {
      sql += ` AND a.category = $${paramIndex++}`;
      params.push(category);
    }

    if (status) {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (a.name ILIKE $${paramIndex} OR a.asset_tag ILIKE $${paramIndex} OR a.serial_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY a.name ASC`;

    const result = await query(sql, params);
    return NextResponse.json({ assets: result.rows });
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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "facility_manager", "technician"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const facilityCheck = await query(
      `SELECT id FROM facilities WHERE id = $1`,
      [data.facility_id],
    );
    if (facilityCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Facility not found" },
        { status: 404 },
      );
    }

    if (data.location_id) {
      const locationCheck = await query(
        `SELECT id FROM locations WHERE id = $1 AND facility_id = $2`,
        [data.location_id, data.facility_id],
      );
      if (locationCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Location not found or does not belong to facility" },
          { status: 404 },
        );
      }
    }

    const tagCheck = await query(`SELECT id FROM assets WHERE asset_tag = $1`, [
      data.asset_tag,
    ]);
    if (tagCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Asset tag already exists" },
        { status: 409 },
      );
    }

    const insertResult = await query(
      `INSERT INTO assets (
        name, asset_tag, facility_id, location_id, category, status,
        manufacturer, model, serial_number, purchase_date, purchase_cost,
        warranty_expiry, notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, NOW(), NOW()
      ) RETURNING *`,
      [
        data.name,
        data.asset_tag,
        data.facility_id,
        data.location_id ?? null,
        data.category,
        data.status,
        data.manufacturer ?? null,
        data.model ?? null,
        data.serial_number ?? null,
        data.purchase_date ?? null,
        data.purchase_cost ?? null,
        data.warranty_expiry ?? null,
        data.notes ?? null,
      ],
    );

    const asset = insertResult.rows[0];
    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
