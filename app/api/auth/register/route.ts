import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const client = await pool.connect();
    try {
      const existing = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email],
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await client.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
        [name, email, hashedPassword, "technician"],
      );

      const user = result.rows[0];

      return NextResponse.json(
        {
          message: "User registered successfully",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
