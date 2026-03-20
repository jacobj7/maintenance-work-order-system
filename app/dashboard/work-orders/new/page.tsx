import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewWorkOrderClient from "./NewWorkOrderClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function NewWorkOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let assets: { id: string; name: string; location: string }[] = [];
  let technicians: { id: string; name: string; email: string }[] = [];

  try {
    const client = await pool.connect();

    try {
      const assetsResult = await client.query<{
        id: string;
        name: string;
        location: string;
      }>(
        `SELECT id::text, name, COALESCE(location, '') as location
         FROM assets
         ORDER BY name ASC`,
      );

      assets = assetsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        location: row.location,
      }));

      const techniciansResult = await client.query<{
        id: string;
        name: string;
        email: string;
      }>(
        `SELECT id::text, name, email
         FROM users
         WHERE role = 'technician' OR role = 'admin'
         ORDER BY name ASC`,
      );

      technicians = techniciansResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching data for new work order:", error);
  }

  const serializedAssets = JSON.parse(JSON.stringify(assets));
  const serializedTechnicians = JSON.parse(JSON.stringify(technicians));

  return (
    <NewWorkOrderClient
      assets={serializedAssets}
      technicians={serializedTechnicians}
    />
  );
}
