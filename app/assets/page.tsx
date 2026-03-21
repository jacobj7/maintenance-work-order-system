import { Suspense } from "react";
import AssetsClient from "./AssetsClient";

export default function AssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <AssetsClient />
    </Suspense>
  );
}
