import { Pool } from "pg";

const globalForPg = globalThis as unknown as { _pgPool: Pool | undefined };

const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg._pgPool = pool;
}

async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<
  import("pg").QueryResult<T extends Record<string, unknown> ? T : never>
> {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

export { pool, query };
