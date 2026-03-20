import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  category: string;
  status: string;
  location: string;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  created_at: string;
}

export default async function AssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let assets: Asset[] = [];
  let error: string | null = null;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query<Asset>(
        `SELECT 
          id,
          name,
          asset_tag,
          category,
          status,
          location,
          assigned_to,
          purchase_date,
          purchase_cost,
          created_at
        FROM assets
        ORDER BY created_at DESC`,
      );
      assets = result.rows;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Failed to fetch assets:", err);
    error = "Failed to load assets. Please try again later.";
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        {(session.user as { role?: string })?.role === "admin" ||
        (session.user as { role?: string })?.role === "manager" ? (
          <Link
            href="/dashboard/assets/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Asset
          </Link>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {assets.length === 0 && !error ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No assets found.</p>
          <p className="text-sm mt-1">Add your first asset to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Tag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {asset.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.asset_tag}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        asset.status === "active"
                          ? "bg-green-100 text-green-800"
                          : asset.status === "inactive"
                            ? "bg-gray-100 text-gray-800"
                            : asset.status === "maintenance"
                              ? "bg-yellow-100 text-yellow-800"
                              : asset.status === "retired"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.assigned_to ?? "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {asset.purchase_cost != null
                        ? `$${Number(asset.purchase_cost).toLocaleString(
                            "en-US",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/assets/${asset.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </Link>
                    {((session.user as { role?: string })?.role === "admin" ||
                      (session.user as { role?: string })?.role ===
                        "manager") && (
                      <Link
                        href={`/dashboard/assets/${asset.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
