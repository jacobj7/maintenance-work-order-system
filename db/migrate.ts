import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create facilities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip VARCHAR(20),
        country VARCHAR(100) DEFAULT 'US',
        phone VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'manager', 'technician', 'viewer')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        floor VARCHAR(50),
        room VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        asset_tag VARCHAR(100) UNIQUE,
        category VARCHAR(100),
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2),
        warranty_expiry DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired', 'disposed')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create work_orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'corrective' CHECK (type IN ('corrective', 'preventive', 'inspection', 'emergency', 'project')),
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'on_hold', 'completed', 'cancelled')),
        due_date TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        estimated_hours NUMERIC(8, 2),
        actual_hours NUMERIC(8, 2),
        cost NUMERIC(12, 2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create status_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create attachments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        file_url TEXT NOT NULL,
        storage_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create preventive_maintenance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS preventive_maintenance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom')),
        frequency_days INTEGER,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        estimated_hours NUMERIC(8, 2),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_generated_at TIMESTAMPTZ,
        next_due_date DATE,
        instructions TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_facility_id ON users(facility_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_locations_facility_id ON locations(facility_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_facility_id ON assets(facility_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_assets_asset_tag ON assets(asset_tag)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_facility_id ON work_orders(facility_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_status_history_work_order_id ON status_history(work_order_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attachments_work_order_id ON attachments(work_order_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_attachments_asset_id ON attachments(asset_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_facility_id ON preventive_maintenance(facility_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_asset_id ON preventive_maintenance(asset_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_next_due_date ON preventive_maintenance(next_due_date)`,
    );

    // Seed admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      // First ensure there's a default facility
      const facilityResult = await client.query(`
        INSERT INTO facilities (name, address, city, state, country)
        VALUES ('Default Facility', '123 Main St', 'Anytown', 'CA', 'US')
        ON CONFLICT DO NOTHING
        RETURNING id
      `);

      let facilityId: string | null = null;
      if (facilityResult.rows.length > 0) {
        facilityId = facilityResult.rows[0].id;
      } else {
        const existingFacility = await client.query(
          `SELECT id FROM facilities LIMIT 1`,
        );
        if (existingFacility.rows.length > 0) {
          facilityId = existingFacility.rows[0].id;
        }
      }

      await client.query(
        `
        INSERT INTO users (facility_id, name, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, 'admin', TRUE)
        ON CONFLICT (email) DO NOTHING
      `,
        [facilityId, "Admin User", adminEmail, passwordHash],
      );

      console.log(`Admin user seeded: ${adminEmail}`);
    } else {
      console.warn(
        "ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed",
      );
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully");
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
  console.error(err);
  process.exit(1);
});
