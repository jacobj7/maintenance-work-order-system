import { Navbar } from "@/components/Navbar";
import { NewWorkOrderForm } from "@/components/NewWorkOrderForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  location_id: number | null;
}

interface Location {
  id: number;
  name: string;
  address: string | null;
}

export default async function NewWorkOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let assets: Asset[] = [];
  let locations: Location[] = [];

  try {
    const assetsResult = await query(
      "SELECT id, name, asset_tag, location_id FROM assets ORDER BY name ASC",
      [],
    );
    assets = assetsResult.rows as Asset[];
  } catch (error) {
    console.error("Failed to fetch assets:", error);
  }

  try {
    const locationsResult = await query(
      "SELECT id, name, address FROM locations ORDER BY name ASC",
      [],
    );
    locations = locationsResult.rows as Location[];
  } catch (error) {
    console.error("Failed to fetch locations:", error);
  }

  const serializedAssets = assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    asset_tag: asset.asset_tag,
    location_id: asset.location_id,
  }));

  const serializedLocations = locations.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Work Order
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill out the form below to create a new work order.
          </p>
        </div>
        <NewWorkOrderForm
          assets={serializedAssets}
          locations={serializedLocations}
        />
      </main>
    </div>
  );
}
