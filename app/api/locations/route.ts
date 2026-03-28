import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  facility_id: z
    .number()
    .int()
    .positive("facility_id must be a positive integer"),
  floor: z.string().max(50).optional().nullable(),
  building: z.string().max(255).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityIdParam = searchParams.get("facility_id");

    let result;

    if (facilityIdParam !== null) {
      const facilityId = parseInt(facilityIdParam, 10);
      if (isNaN(facilityId) || facilityId <= 0) {
        return NextResponse.json(
          { error: "Invalid facility_id query parameter" },
          { status: 400 },
        );
      }
      result = await query(
        "SELECT * FROM locations WHERE facility_id = $1 ORDER BY name ASC",
        [facilityId],
      );
    } else {
      result = await query("SELECT * FROM locations ORDER BY name ASC", []);
    }

    return NextResponse.json({ locations: result.rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = createLocationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 422 },
      );
    }

    const { name, facility_id, floor, building } = parseResult.data;

    const result = await query(
      `INSERT INTO locations (name, facility_id, floor, building, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, facility_id, floor ?? null, building ?? null],
    );

    return NextResponse.json({ location: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
