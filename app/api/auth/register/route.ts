import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.string().min(1, "Role is required"),
  orgName: z.string().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, password, role, orgName } = parseResult.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if email already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    let organizationId: string | null = null;

    if (orgName) {
      const slug = slugify(orgName);

      // Check if organization with this slug already exists
      const existingOrg = await client.query(
        "SELECT id FROM organizations WHERE slug = $1",
        [slug],
      );

      if (existingOrg.rows.length > 0) {
        organizationId = existingOrg.rows[0].id;
      } else {
        // Create new organization
        const newOrg = await client.query(
          `INSERT INTO organizations (name, slug, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())
           RETURNING id`,
          [orgName, slug],
        );
        organizationId = newOrg.rows[0].id;
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const newUser = await client.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [name, email, passwordHash, role, organizationId],
    );

    await client.query("COMMIT");

    const userId = newUser.rows[0].id;

    return NextResponse.json(
      { id: userId, message: "User registered successfully" },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
