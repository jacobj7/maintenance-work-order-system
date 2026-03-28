import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const facilitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(1, "ZIP code is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to access this resource." },
      { status: 401 },
    );
  }

  try {
    const facilities = await query(
      "SELECT * FROM facilities ORDER BY created_at DESC",
      [],
    );

    return NextResponse.json({ facilities });
  } catch (error) {
    console.error("Error fetching facilities:", error);
    return NextResponse.json(
      { error: "Failed to fetch facilities" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to access this resource." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const validatedData = facilitySchema.parse(body);

    const facilities = await query(
      `INSERT INTO facilities (name, address, city, state, zip, phone, email, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        validatedData.name,
        validatedData.address,
        validatedData.city,
        validatedData.state,
        validatedData.zip,
        validatedData.phone || null,
        validatedData.email || null,
        validatedData.status,
      ],
    );

    const facility = facilities[0];

    return NextResponse.json({ facility }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error creating facility:", error);
    return NextResponse.json(
      { error: "Failed to create facility" },
      { status: 500 },
    );
  }
}
