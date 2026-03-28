import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import NewWorkOrderClient from "@/components/work-orders/NewWorkOrderClient";

interface Asset {
  id: number;
  name: string;
  asset_tag: string | null;
  location_id: number | null;
}

interface Location {
  id: number;
  name: string;
  description: string | null;
}

export default async function NewWorkOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const assetsResult = await query<Asset>(
    `SELECT id, name, asset_tag, location_id
     FROM assets
     ORDER BY name ASC`,
    [],
  );

  const locationsResult = await query<Location>(
    `SELECT id, name, description
     FROM locations
     ORDER BY name ASC`,
    [],
  );

  const assets: Asset[] = assetsResult.rows ?? [];
  const locations: Location[] = locationsResult.rows ?? [];

  return (
    <NewWorkOrderClient
      assets={JSON.parse(JSON.stringify(assets))}
      locations={JSON.parse(JSON.stringify(locations))}
    />
  );
}
