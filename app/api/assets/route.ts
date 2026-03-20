import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createAssetSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.string().min(1, "Type is required").max(100),
  serialNumber: z.string().min(1, "Serial number is required").max(100),
  locationId: z.string().uuid("Invalid location ID"),
  status: z.enum(["active", "inactive", "maintenance", "retired"]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");

    const orgId = (session.user as any).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    let query: string;
    let params: any[];

    if (locationId) {
      query = `
        SELECT 
          a.id,
          a.name,
          a.type,
          a.serial_number AS "serialNumber",
          a.location_id AS "locationId",
          a.status,
          a.org_id AS "orgId",
          a.created_at AS "createdAt",
          a.updated_at AS "updatedAt",
          l.name AS "locationName"
        FROM assets a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.org_id = $1 AND a.location_id = $2
        ORDER BY a.created_at DESC
      `;
      params = [orgId, locationId];
    } else {
      query = `
        SELECT 
          a.id,
          a.name,
          a.type,
          a.serial_number AS "serialNumber",
          a.location_id AS "locationId",
          a.status,
          a.org_id AS "orgId",
          a.created_at AS "createdAt",
          a.updated_at AS "updatedAt",
          l.name AS "locationName"
        FROM assets a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.org_id = $1
        ORDER BY a.created_at DESC
      `;
      params = [orgId];
    }

    const result = await pool.query(query, params);

    return NextResponse.json({ assets: result.rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
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

    const { name, type, serialNumber, locationId, status } =
      validationResult.data;

    const locationCheck = await pool.query(
      "SELECT id FROM locations WHERE id = $1 AND org_id = $2",
      [locationId, orgId],
    );

    if (locationCheck.rowCount === 0) {
      return NextResponse.json(
        { error: "Location not found or does not belong to your organization" },
        { status: 404 },
      );
    }

    const serialCheck = await pool.query(
      "SELECT id FROM assets WHERE serial_number = $1 AND org_id = $2",
      [serialNumber, orgId],
    );

    if (serialCheck.rowCount && serialCheck.rowCount > 0) {
      return NextResponse.json(
        { error: "An asset with this serial number already exists" },
        { status: 409 },
      );
    }

    const insertResult = await pool.query(
      `
      INSERT INTO assets (name, type, serial_number, location_id, status, org_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING 
        id,
        name,
        type,
        serial_number AS "serialNumber",
        location_id AS "locationId",
        status,
        org_id AS "orgId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [name, type, serialNumber, locationId, status, orgId],
    );

    return NextResponse.json({ asset: insertResult.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
