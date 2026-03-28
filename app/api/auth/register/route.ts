import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  role: z.string().min(1, "Role is required").max(50),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = registerSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Validation error",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parseResult.data;

  try {
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role],
    );

    const newUser = result.rows[0];

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
