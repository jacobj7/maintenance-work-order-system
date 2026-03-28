import { query } from "@/lib/db";
import LocationsClient from "@/components/LocationsClient";

export const metadata = {
  title: "Locations",
  description: "Browse all available locations",
};

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

async function getLocations(): Promise<Location[]> {
  try {
    const result = await query(
      `SELECT
        id,
        name,
        address,
        city,
        state,
        zip_code,
        country,
        latitude,
        longitude,
        phone,
        email,
        website,
        description,
        created_at,
        updated_at
      FROM locations
      ORDER BY name ASC`,
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: row.name as string,
      address: row.address as string,
      city: row.city as string,
      state: row.state as string,
      zip_code: row.zip_code as string,
      country: row.country as string,
      latitude: row.latitude as number | null,
      longitude: row.longitude as number | null,
      phone: row.phone as string | null,
      email: row.email as string | null,
      website: row.website as string | null,
      description: row.description as string | null,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    }));
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return [];
  }
}

export default async function LocationsPage() {
  const locations = await getLocations();

  const serializedLocations = JSON.parse(JSON.stringify(locations));

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
        <p className="mt-2 text-gray-600">
          Browse all available locations ({locations.length} total)
        </p>
      </div>
      <LocationsClient locations={serializedLocations} />
    </main>
  );
}
