import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const locationSchema = z.object({
  facility_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  floor: z.string().optional(),
  room_number: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facility_id");

    let sql = `
      SELECT 
        l.*,
        f.name as facility_name
      FROM locations l
      LEFT JOIN facilities f ON l.facility_id = f.id
    `;
    const params: any[] = [];

    if (facilityId) {
      sql += ` WHERE l.facility_id = $1`;
      params.push(facilityId);
    }

    sql += ` ORDER BY l.created_at DESC`;

    const locations = await query(sql, params);
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = locationSchema.parse(body);

    const facilityCheck = await query(
      "SELECT id FROM facilities WHERE id = $1",
      [validated.facility_id],
    );

    if (!facilityCheck || facilityCheck.length === 0) {
      return NextResponse.json(
        { error: "Facility not found" },
        { status: 404 },
      );
    }

    const result = await query(
      `INSERT INTO locations (facility_id, name, description, floor, room_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        validated.facility_id,
        validated.name,
        validated.description || null,
        validated.floor || null,
        validated.room_number || null,
      ],
    );

    const location = result[0];
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
