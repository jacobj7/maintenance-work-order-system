import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const LocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM locations ORDER BY created_at DESC",
      );
      return NextResponse.json({ locations: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
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

    const validationResult = LocationSchema.safeParse(body);
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

    const client = await pool.connect();
    try {
      const result = await client.query(
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
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          data.name,
          data.address ?? null,
          data.city ?? null,
          data.state ?? null,
          data.country ?? null,
          data.postal_code ?? null,
          data.latitude ?? null,
          data.longitude ?? null,
          data.description ?? null,
        ],
      );

      return NextResponse.json({ location: result.rows[0] }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
