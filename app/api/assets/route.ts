import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  facility_id: z
    .number()
    .int()
    .positive("Facility ID must be a positive integer"),
  location_id: z
    .number()
    .int()
    .positive("Location ID must be a positive integer")
    .optional()
    .nullable(),
  category: z.string().min(1, "Category is required").max(100),
  serial_number: z.string().max(255).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facility_id");

    let result;
    if (facilityId) {
      const parsedFacilityId = parseInt(facilityId, 10);
      if (isNaN(parsedFacilityId)) {
        return NextResponse.json(
          { error: "Invalid facility_id parameter" },
          { status: 400 },
        );
      }
      result = await query(
        `SELECT 
          a.id,
          a.name,
          a.facility_id,
          a.location_id,
          a.category,
          a.serial_number,
          a.created_at,
          a.updated_at,
          f.name AS facility_name,
          l.name AS location_name
        FROM assets a
        LEFT JOIN facilities f ON a.facility_id = f.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.facility_id = $1
        ORDER BY a.created_at DESC`,
        [parsedFacilityId],
      );
    } else {
      result = await query(
        `SELECT 
          a.id,
          a.name,
          a.facility_id,
          a.location_id,
          a.category,
          a.serial_number,
          a.created_at,
          a.updated_at,
          f.name AS facility_name,
          l.name AS location_name
        FROM assets a
        LEFT JOIN facilities f ON a.facility_id = f.id
        LEFT JOIN locations l ON a.location_id = l.id
        ORDER BY a.created_at DESC`,
        [],
      );
    }

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

    const validationResult = createAssetSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { name, facility_id, location_id, category, serial_number } =
      validationResult.data;

    const result = await query(
      `INSERT INTO assets (name, facility_id, location_id, category, serial_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING 
         id,
         name,
         facility_id,
         location_id,
         category,
         serial_number,
         created_at,
         updated_at`,
      [name, facility_id, location_id ?? null, category, serial_number ?? null],
    );

    const asset = result.rows[0];

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
