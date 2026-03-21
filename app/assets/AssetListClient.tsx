"use client";

import { useState } from "react";

interface Asset {
  id: number;
  name: string;
  location?: string;
  status?: string;
}

interface AssetListClientProps {
  assets?: Asset[];
}

export function AssetListClient({ assets = [] }: AssetListClientProps) {
  const [search, setSearch] = useState("");

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-500">No assets found.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((asset) => (
            <li key={asset.id} className="border rounded p-3">
              <div className="font-medium">{asset.name}</div>
              {asset.location && (
                <div className="text-sm text-gray-500">{asset.location}</div>
              )}
              {asset.status && (
                <div className="text-sm text-gray-400">{asset.status}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AssetListClient;
