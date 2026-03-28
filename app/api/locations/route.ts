import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const locationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  address: z.string().min(1, "Address is required").max(500),
  city: z.string().min(1, "City is required").max(255),
  state: z.string().min(1, "State is required").max(255),
  country: z.string().min(1, "Country is required").max(255),
  postal_code: z.string().max(20).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  description: z.string().max(2000).optional(),
  is_active: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT
        id,
        name,
        address,
        city,
        state,
        country,
        postal_code,
        latitude,
        longitude,
        description,
        is_active,
        created_at,
        updated_at
      FROM locations
      ORDER BY name ASC`,
      [],
    );

    return NextResponse.json({ locations: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = locationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      name,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      description,
      is_active,
    } = validationResult.data;

    const result = await query(
      `INSERT INTO locations (
        name,
        address,
        city,
        state,
        country,
        postal_code,
        latitude,
        longitude,
        description,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING
        id,
        name,
        address,
        city,
        state,
        country,
        postal_code,
        latitude,
        longitude,
        description,
        is_active,
        created_at,
        updated_at`,
      [
        name,
        address,
        city,
        state,
        country,
        postal_code ?? null,
        latitude ?? null,
        longitude ?? null,
        description ?? null,
        is_active,
      ],
    );

    return NextResponse.json({ location: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
