import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const createFacilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
});

export async function GET() {
  try {
    const result = await query(
      "SELECT * FROM facilities ORDER BY created_at DESC",
      [],
    );
    return NextResponse.json({ facilities: result.rows });
  } catch (error) {
    console.error("Error fetching facilities:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = createFacilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, address } = parsed.data;

    const result = await query(
      "INSERT INTO facilities (name, address, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *",
      [name, address],
    );

    return NextResponse.json({ facility: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating facility:", error);
    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 },
    );
  }
}
