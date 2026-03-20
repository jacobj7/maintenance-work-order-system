"use client";

import Link from "next/link";

type Asset = {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  location: string;
  status: string;
};

type AssetListClientProps = {
  assets: Asset[];
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  retired: "bg-red-100 text-red-800",
  "in-repair": "bg-orange-100 text-orange-800",
};

export default function AssetListClient({ assets }: AssetListClientProps) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="mb-4 h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">
          No assets found
        </h3>
        <p className="text-sm text-gray-500">
          Get started by adding your first asset.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Serial Number
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Location
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {assets.map((asset) => (
              <tr
                key={asset.id}
                className="transition-colors duration-150 hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <svg
                        className="h-4 w-4 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {asset.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm text-gray-700">{asset.type}</span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-mono text-sm text-gray-600">
                    {asset.serial_number || "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">
                      {asset.location || "—"}
                    </span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      statusColors[asset.status?.toLowerCase()] ??
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {asset.status || "Unknown"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Link
                    href={`/dashboard/assets/${asset.id}/work-orders`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    Repair History
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
        <p className="text-xs text-gray-500">
          Showing <span className="font-medium">{assets.length}</span>{" "}
          {assets.length === 1 ? "asset" : "assets"}
        </p>
      </div>
    </div>
  );
}
