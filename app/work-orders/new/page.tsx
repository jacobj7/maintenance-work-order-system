import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewWorkOrderClient from "./NewWorkOrderClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getAssets() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name, asset_tag, location_id FROM assets WHERE active = true ORDER BY name ASC",
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getLocations() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name, address FROM locations WHERE active = true ORDER BY name ASC",
    );
    return result.rows;
  } finally {
    client.release();
  }
}

async function getAssignableUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name, email, role FROM users WHERE role IN ('technician', 'admin') AND active = true ORDER BY name ASC",
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export default async function NewWorkOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [assets, locations, assignableUsers] = await Promise.all([
    getAssets(),
    getLocations(),
    getAssignableUsers(),
  ]);

  return (
    <NewWorkOrderClient
      assets={assets}
      locations={locations}
      assignableUsers={assignableUsers}
      currentUserId={session.user?.id as string}
    />
  );
}
