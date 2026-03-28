import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import WorkOrderForm from "@/components/WorkOrderForm";

interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  location_id: string;
}

interface Location {
  id: string;
  name: string;
  building: string;
  floor: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

export default async function NewWorkOrderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "manager" && role !== "technician") {
    redirect("/dashboard");
  }

  const assetsResult = await query<Asset>(
    `SELECT a.id, a.name, a.asset_tag, a.location_id
     FROM assets a
     ORDER BY a.name ASC`,
  );
  const assets: Asset[] = assetsResult ?? [];

  const locationsResult = await query<Location>(
    `SELECT l.id, l.name, l.building, l.floor
     FROM locations l
     ORDER BY l.building ASC, l.floor ASC, l.name ASC`,
  );
  const locations: Location[] = locationsResult ?? [];

  const techniciansResult = await query<Technician>(
    `SELECT u.id, u.name, u.email
     FROM users u
     WHERE u.role = 'technician'
     ORDER BY u.name ASC`,
  );
  const technicians: Technician[] = techniciansResult ?? [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Work Order
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill out the form below to create a new work order.
        </p>
      </div>
      <WorkOrderForm
        assets={assets}
        locations={locations}
        technicians={technicians}
        currentUserRole={role}
      />
    </div>
  );
}
