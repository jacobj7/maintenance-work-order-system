import { Client } from "pg";
import bcrypt from "bcryptjs";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await client.connect();

  try {
    await client.query("BEGIN");

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'technician',
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        building VARCHAR(255),
        floor VARCHAR(50),
        room VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        asset_tag VARCHAR(100) UNIQUE NOT NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        category VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        serial_number VARCHAR(255),
        purchase_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Work orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        estimated_cost NUMERIC(10, 2),
        actual_cost NUMERIC(10, 2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Status history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_history (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        notes TEXT,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Work order parts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_order_parts (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        part_name VARCHAR(255) NOT NULL,
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
        unit_cost NUMERIC(10, 2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Labor entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_entries (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        hours NUMERIC(8, 2) NOT NULL,
        hourly_rate NUMERIC(10, 2),
        notes TEXT,
        worked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Maintenance schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        frequency_days INTEGER NOT NULL,
        last_performed DATE,
        next_due DATE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `
        INSERT INTO users (email, password_hash, role, name)
        VALUES ($1, $2, 'admin', 'Administrator')
        ON CONFLICT (email) DO NOTHING
        `,
        [adminEmail, passwordHash],
      );
      console.log(`Admin user seeded: ${adminEmail}`);
    } else {
      console.warn(
        "ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.",
      );
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back:", err);
    throw err;
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
