import { AssetListClient } from "./AssetListClient";

export default function AssetsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Assets</h1>
      <AssetListClient assets={[]} />
    </div>
  );
}
