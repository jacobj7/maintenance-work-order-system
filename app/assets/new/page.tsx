import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import NewAssetClient from "./NewAssetClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function NewAssetPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let locations: { id: number; name: string }[] = [];

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name FROM locations ORDER BY name ASC",
      );
      locations = result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to fetch locations:", error);
  }

  return <NewAssetClient locations={locations} />;
}
