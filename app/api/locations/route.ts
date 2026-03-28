import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const createLocationSchema = z.object({
  facility_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  floor: z.string().optional(),
  room: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get("facility_id");

    let sql = `
      SELECT 
        l.id,
        l.facility_id,
        l.name,
        l.floor,
        l.room,
        l.description,
        l.created_at,
        l.updated_at,
        f.name as facility_name
      FROM locations l
      JOIN facilities f ON l.facility_id = f.id
    `;
    const params: any[] = [];

    if (facilityId) {
      sql += ` WHERE l.facility_id = $1`;
      params.push(facilityId);
    }

    sql += ` ORDER BY f.name, l.name`;

    const result = await query(sql, params);
    return NextResponse.json({ locations: result.rows });
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 },
      );
    }

    const userResult = await query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE email = $1`,
      [userEmail],
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    if (!["admin", "facility_manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { facility_id, name, floor, room, description } = parsed.data;

    const facilityCheck = await query<{ id: string }>(
      `SELECT id FROM facilities WHERE id = $1`,
      [facility_id],
    );

    if (facilityCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Facility not found" },
        { status: 404 },
      );
    }

    const insertResult = await query<{
      id: string;
      facility_id: string;
      name: string;
      floor: string | null;
      room: string | null;
      description: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO locations (facility_id, name, floor, room, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, facility_id, name, floor, room, description, created_at, updated_at`,
      [facility_id, name, floor ?? null, room ?? null, description ?? null],
    );

    if (insertResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to create location" },
        { status: 500 },
      );
    }

    const location = insertResult.rows[0];

    const facilityResult = await query<{ name: string }>(
      `SELECT name FROM facilities WHERE id = $1`,
      [facility_id],
    );

    const facilityName =
      facilityResult.rows.length > 0 ? facilityResult.rows[0].name : null;

    return NextResponse.json(
      {
        location: {
          ...location,
          facility_name: facilityName,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
