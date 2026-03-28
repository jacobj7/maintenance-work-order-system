import { query } from "@/lib/db";
import NewWorkOrderForm from "@/components/NewWorkOrderForm";

export const dynamic = "force-dynamic";

async function getAssets() {
  const result = await query(
    `SELECT id, name, asset_tag FROM assets ORDER BY name ASC`,
    [],
  );
  return result.rows;
}

async function getLocations() {
  const result = await query(
    `SELECT id, name FROM locations ORDER BY name ASC`,
    [],
  );
  return result.rows;
}

async function getTechnicians() {
  const result = await query(
    `SELECT id, name, email FROM users WHERE role = 'technician' ORDER BY name ASC`,
    [],
  );
  return result.rows;
}

export default async function NewWorkOrderPage() {
  const [assets, locations, technicians] = await Promise.all([
    getAssets(),
    getLocations(),
    getTechnicians(),
  ]);

  const serializedAssets = assets.map(
    (a: { id: number; name: string; asset_tag: string }) => ({
      id: a.id,
      name: a.name,
      asset_tag: a.asset_tag,
    }),
  );

  const serializedLocations = locations.map(
    (l: { id: number; name: string }) => ({
      id: l.id,
      name: l.name,
    }),
  );

  const serializedTechnicians = technicians.map(
    (t: { id: number; name: string; email: string }) => ({
      id: t.id,
      name: t.name,
      email: t.email,
    }),
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create New Work Order
      </h1>
      <NewWorkOrderForm
        assets={serializedAssets}
        locations={serializedLocations}
        technicians={serializedTechnicians}
      />
    </div>
  );
}
