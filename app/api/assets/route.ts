import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { query } from "@/lib/db";

const assetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  asset_tag: z.string().min(1, "Asset tag is required"),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().optional(),
  status: z
    .enum(["active", "inactive", "maintenance", "retired"])
    .default("active"),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        a.*,
        COUNT(wo.id) FILTER (WHERE wo.status NOT IN ('completed', 'cancelled')) as open_work_orders
      FROM assets a
      LEFT JOIN work_orders wo ON wo.asset_id = a.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      queryText += ` AND a.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (a.name ILIKE $${paramIndex} OR a.asset_tag ILIKE $${paramIndex} OR a.location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` GROUP BY a.id ORDER BY a.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    const countQuery = `
      SELECT COUNT(*) FROM assets a WHERE 1=1
      ${category ? ` AND a.category = $1` : ""}
      ${status ? ` AND a.status = $${category ? 2 : 1}` : ""}
      ${search ? ` AND (a.name ILIKE $${(category ? 1 : 0) + (status ? 1 : 0) + 1} OR a.asset_tag ILIKE $${(category ? 1 : 0) + (status ? 1 : 0) + 1} OR a.location ILIKE $${(category ? 1 : 0) + (status ? 1 : 0) + 1})` : ""}
    `;

    const countParams: unknown[] = [];
    if (category) countParams.push(category);
    if (status) countParams.push(status);
    if (search) countParams.push(`%${search}%`);

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      assets: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "manager") {
    return NextResponse.json(
      { error: "Forbidden: Only managers can create assets" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const validationResult = assetSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      name,
      asset_tag,
      category,
      location,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      status,
      notes,
    } = validationResult.data;

    const existingAsset = await query(
      "SELECT id FROM assets WHERE asset_tag = $1",
      [asset_tag],
    );

    if (existingAsset.rows.length > 0) {
      return NextResponse.json(
        { error: "Asset tag already exists" },
        { status: 409 },
      );
    }

    const result = await query(
      `INSERT INTO assets (
        name, asset_tag, category, location, manufacturer, model,
        serial_number, purchase_date, purchase_cost, status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        name,
        asset_tag,
        category,
        location,
        manufacturer || null,
        model || null,
        serial_number || null,
        purchase_date || null,
        purchase_cost || null,
        status,
        notes || null,
      ],
    );

    return NextResponse.json({ asset: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
