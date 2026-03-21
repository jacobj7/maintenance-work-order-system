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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'technician',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        asset_tag VARCHAR(100) UNIQUE,
        serial_number VARCHAR(100),
        model VARCHAR(255),
        manufacturer VARCHAR(255),
        purchase_date DATE,
        purchase_cost NUMERIC(12, 2),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        parent_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        category VARCHAR(100),
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        target_date TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        completion_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS parts_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
        part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100),
        quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
        unit_cost NUMERIC(12, 2),
        total_cost NUMERIC(12, 2),
        notes TEXT,
        logged_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        hours NUMERIC(8, 2) NOT NULL,
        hourly_rate NUMERIC(10, 2),
        total_cost NUMERIC(12, 2),
        description TEXT,
        work_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100),
        file_size INTEGER,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS preventive_maintenance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        frequency VARCHAR(50) NOT NULL,
        frequency_interval INTEGER NOT NULL DEFAULT 1,
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        category VARCHAR(100),
        estimated_hours NUMERIC(8, 2),
        last_performed_at TIMESTAMP WITH TIME ZONE,
        next_due_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
      CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
      CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
      CREATE INDEX IF NOT EXISTS idx_work_orders_location_id ON work_orders(location_id);
      CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
      CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id);
      CREATE INDEX IF NOT EXISTS idx_parts_log_work_order_id ON parts_log(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_labor_entries_work_order_id ON labor_entries(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_work_order_id ON attachments(work_order_id);
      CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_asset_id ON preventive_maintenance(asset_id);
      CREATE INDEX IF NOT EXISTS idx_preventive_maintenance_next_due_at ON preventive_maintenance(next_due_at);
    `);

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
  console.error(err);
  process.exit(1);
});
