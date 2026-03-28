import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'technician',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        asset_tag VARCHAR(100) UNIQUE,
        serial_number VARCHAR(100),
        model VARCHAR(255),
        manufacturer VARCHAR(255),
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        parent_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        due_date TIMESTAMP WITH TIME ZONE,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        estimated_hours NUMERIC(8, 2),
        actual_hours NUMERIC(8, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS status_history (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
        asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS preventive_schedules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
        location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
        frequency_days INTEGER,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        estimated_hours NUMERIC(8, 2),
        last_generated_at TIMESTAMP WITH TIME ZONE,
        next_due_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
      CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
      CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date);
      CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
      CREATE INDEX IF NOT EXISTS idx_status_history_work_order_id ON status_history(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id);
      CREATE INDEX IF NOT EXISTS idx_preventive_schedules_next_due_at ON preventive_schedules(next_due_at);
    `);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await client.query(
        `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING;
        `,
        ["Administrator", adminEmail, passwordHash, "admin"],
      );

      console.log(`Admin user seeded for email: ${adminEmail}`);
    } else {
      console.warn(
        "ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.",
      );
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Unhandled migration error:", err);
  process.exit(1);
});
