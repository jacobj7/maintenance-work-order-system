import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('manager', 'technician');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'technician',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255),
        serial_number VARCHAR(255),
        status VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE work_order_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        requested_by_email VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(50),
        status work_order_status NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS status_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        old_status work_order_status,
        new_status work_order_status NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolling back:", error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
