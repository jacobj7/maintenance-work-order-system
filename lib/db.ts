import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(sql: string, params: unknown[] = []) {
  const result = await pool.query(sql, params);
  return result;
}
