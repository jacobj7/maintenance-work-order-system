import { NextRequest, NextResponse } from "next/server";
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
  status: z
    .enum(["active", "inactive", "maintenance", "retired"])
    .default("active"),
  location_id: z.number().int().positive().optional().nullable(),
  category: z.string().optional(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get("status");
    const location_id = searchParams.get("location_id");
    const search = searchParams.get("search");

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      values.push(status);
    }

    if (location_id) {
      conditions.push(`a.location_id = $${paramIndex++}`);
      values.push(parseInt(location_id, 10));
    }

    if (search) {
      conditions.push(
        `(a.name ILIKE $${paramIndex} OR a.asset_tag ILIKE $${paramIndex} OR a.serial_number ILIKE $${paramIndex})`,
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM assets a
      ${whereClause}
    `;

    const dataQuery = `
      SELECT
        a.id,
        a.name,
        a.description,
        a.asset_tag,
        a.serial_number,
        a.status,
        a.category,
        a.purchase_date,
        a.purchase_price,
        a.notes,
        a.location_id,
        a.created_at,
        a.updated_at,
        l.id AS location_id,
        l.name AS location_name,
        l.address AS location_address,
        l.city AS location_city,
        l.state AS location_state,
        l.country AS location_country
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countValues = [...values];
    const dataValues = [...values, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, countValues),
      client.query(dataQuery, dataValues),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    const assets = dataResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      asset_tag: row.asset_tag,
      serial_number: row.serial_number,
      status: row.status,
      category: row.category,
      purchase_date: row.purchase_date,
      purchase_price: row.purchase_price,
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
    }));

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
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
        {
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    const result = await client.query(
      `INSERT INTO assets (
        name,
        description,
        asset_tag,
        serial_number,
        status,
        location_id,
        category,
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
        data.asset_tag ?? null,
        data.serial_number ?? null,
        data.status,
        data.location_id ?? null,
        data.category ?? null,
        data.purchase_date ?? null,
        data.purchase_price ?? null,
        data.notes ?? null,
      ],
    );

    const newAsset = result.rows[0];

    let location = null;
    if (newAsset.location_id) {
      const locationResult = await client.query(
        "SELECT id, name, address, city, state, country FROM locations WHERE id = $1",
        [newAsset.location_id],
      );
      if (locationResult.rows.length > 0) {
        location = locationResult.rows[0];
      }
    }

    return NextResponse.json(
      {
        asset: {
          ...newAsset,
          location,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/assets error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "Asset with this tag or serial number already exists" },
          { status: 409 },
        );
      }
      if (error.message.includes("foreign key")) {
        return NextResponse.json(
          { error: "Invalid location_id: location does not exist" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
