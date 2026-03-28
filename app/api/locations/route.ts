import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  building: z.string().min(1, "Building is required").max(255),
  floor: z.string().max(50).optional().nullable(),
  room: z.string().max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(
      `SELECT id, name, building, floor, room, created_at, updated_at
       FROM locations
       ORDER BY building ASC, floor ASC, room ASC, name ASC`,
      [],
    );

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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        { status: 400 },
      );
    }

    const { name, building, floor, room } = parseResult.data;

    const result = await query(
      `INSERT INTO locations (name, building, floor, room, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, building, floor, room, created_at, updated_at`,
      [name, building, floor ?? null, room ?? null],
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
