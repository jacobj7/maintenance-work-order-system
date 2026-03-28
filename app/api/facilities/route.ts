import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const createFacilitySchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zip_code: z.string().min(1).max(20),
  country: z.string().min(1).max(100).default("US"),
  facility_type: z.string().min(1).max(100),
  total_area_sqft: z.number().positive().optional(),
  year_built: z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("is_active");

    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR city ILIKE $${paramIndex + 1} OR address ILIKE $${paramIndex + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      whereClause += ` AND is_active = $${paramIndex}`;
      params.push(isActive === "true");
      paramIndex += 1;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM facilities ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count || "0");

    const facilitiesResult = await query(
      `SELECT 
        id, name, address, city, state, zip_code, country,
        facility_type, total_area_sqft, year_built, is_active,
        created_at, updated_at
       FROM facilities 
       ${whereClause}
       ORDER BY name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return NextResponse.json({
      facilities: facilitiesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/facilities error:", error);
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
    if (!["admin", "facility_manager"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = createFacilitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = validationResult.data;

    const existingResult = await query<{ id: string }>(
      `SELECT id FROM facilities WHERE name = $1 AND city = $2 AND state = $3`,
      [data.name, data.city, data.state],
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "A facility with this name already exists in this city and state",
        },
        { status: 409 },
      );
    }

    const facilitiesResult = await query(
      `INSERT INTO facilities (
        name, address, city, state, zip_code, country,
        facility_type, total_area_sqft, year_built, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        data.name,
        data.address,
        data.city,
        data.state,
        data.zip_code,
        data.country,
        data.facility_type,
        data.total_area_sqft ?? null,
        data.year_built ?? null,
        data.is_active,
      ],
    );

    const facility = facilitiesResult.rows[0];

    if (!facility) {
      return NextResponse.json(
        { error: "Failed to create facility" },
        { status: 500 },
      );
    }

    return NextResponse.json({ facility }, { status: 201 });
  } catch (error) {
    console.error("POST /api/facilities error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
