import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'technician',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        building VARCHAR(255),
        floor VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        category VARCHAR(100),
        serial_number VARCHAR(255)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        requestor_email VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        technician_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS status_updates (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parts_costs (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        part_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_entries (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => {
    pool.end();
  })
  .catch((error) => {
    console.error("Unhandled migration error:", error);
    pool.end();
    process.exit(1);
  });
