import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import AssetsClient from "@/components/AssetsClient";

interface Asset {
  id: number;
  name: string;
  description: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  status: string;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  location_id: number | null;
  location_name: string | null;
  location_address: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export default async function AssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let assets: Asset[] = [];

  try {
    const result = await query(
      `SELECT
        a.id,
        a.name,
        a.description,
        a.asset_tag,
        a.serial_number,
        a.status,
        a.purchase_date,
        a.purchase_price,
        a.current_value,
        a.location_id,
        l.name AS location_name,
        l.address AS location_address,
        a.category,
        a.manufacturer,
        a.model,
        a.created_at,
        a.updated_at
      FROM assets a
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.created_at DESC`,
      [],
    );

    assets = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | null,
      asset_tag: row.asset_tag as string | null,
      serial_number: row.serial_number as string | null,
      status: row.status as string,
      purchase_date: row.purchase_date
        ? new Date(row.purchase_date as string).toISOString()
        : null,
      purchase_price: row.purchase_price as number | null,
      current_value: row.current_value as number | null,
      location_id: row.location_id as number | null,
      location_name: row.location_name as string | null,
      location_address: row.location_address as string | null,
      category: row.category as string | null,
      manufacturer: row.manufacturer as string | null,
      model: row.model as string | null,
      created_at: new Date(row.created_at as string).toISOString(),
      updated_at: new Date(row.updated_at as string).toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    assets = [];
  }

  const serializedAssets = JSON.parse(JSON.stringify(assets));

  return (
    <main className="min-h-screen bg-gray-50">
      <AssetsClient assets={serializedAssets} />
    </main>
  );
}
