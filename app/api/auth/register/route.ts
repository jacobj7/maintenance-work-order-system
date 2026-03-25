import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["manager", "technician"], {
    errorMap: () => ({ message: "Role must be manager or technician" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
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
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password, role } = parseResult.data;

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, role],
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
