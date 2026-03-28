import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };

export async function query<T = any>(
  sql: string,
  params: any[] = [],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    client.release();
  }
}

if (process.env.NODE_ENV === "development") {
  import("@/db/migrate").catch((err) => {
    console.error("Migration error:", err);
  });
}

export default pool;
