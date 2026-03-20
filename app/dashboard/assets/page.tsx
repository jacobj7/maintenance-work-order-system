import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AssetListClient from "./AssetListClient";

async function getAssets() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/assets`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch assets");
  }

  return response.json();
}

export default async function AssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let assets = [];
  try {
    const data = await getAssets();
    assets = data.assets || data || [];
  } catch (error) {
    console.error("Error fetching assets:", error);
    assets = [];
  }

  const serializedAssets = assets.map((asset: Record<string, unknown>) => ({
    ...asset,
    createdAt: asset.createdAt
      ? new Date(asset.createdAt as string).toISOString()
      : null,
    updatedAt: asset.updatedAt
      ? new Date(asset.updatedAt as string).toISOString()
      : null,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <p className="text-gray-600 mt-1">Manage your digital assets</p>
      </div>
      <AssetListClient assets={serializedAssets} />
    </div>
  );
}
