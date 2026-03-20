import { AssetListClient } from "./AssetListClient";

async function getAssets() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/assets`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch assets");
  }

  return res.json();
}

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Assets</h1>
      <AssetListClient assets={assets} />
    </div>
  );
}
