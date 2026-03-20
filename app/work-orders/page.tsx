import { Suspense } from "react";
import WorkOrderListClient from "./WorkOrderListClient";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface SearchParams {
  status?: string;
  priority?: string;
  assigned_to?: string;
  search?: string;
  page?: string;
}

async function getWorkOrders(searchParams: SearchParams): Promise<WorkOrder[]> {
  const params = new URLSearchParams();

  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.priority) params.set("priority", searchParams.priority);
  if (searchParams.assigned_to)
    params.set("assigned_to", searchParams.assigned_to);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.page) params.set("page", searchParams.page);

  const queryString = params.toString();
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/work-orders${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch work orders: ${response.statusText}`);
  }

  const data = await response.json();
  return data.workOrders ?? data ?? [];
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  let workOrders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    workOrders = await getWorkOrders(searchParams);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load work orders";
  }

  const serializedWorkOrders = workOrders.map((wo) => ({
    ...wo,
    created_at: wo.created_at ? new Date(wo.created_at).toISOString() : "",
    updated_at: wo.updated_at ? new Date(wo.updated_at).toISOString() : "",
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
        <p className="mt-2 text-gray-600">Manage and track all work orders</p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading work orders
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <span className="ml-3 text-gray-600">Loading work orders...</span>
          </div>
        }
      >
        <WorkOrderListClient
          workOrders={serializedWorkOrders}
          initialSearchParams={searchParams}
        />
      </Suspense>
    </div>
  );
}
