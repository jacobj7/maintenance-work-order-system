import { Suspense } from "react";
import WorkOrderListClient from "./WorkOrderListClient";

interface WorkOrdersPageProps {
  searchParams: {
    status?: string;
    priority?: string;
    page?: string;
    search?: string;
  };
}

async function getWorkOrders(params: {
  status?: string;
  priority?: string;
  page?: string;
  search?: string;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);
  if (params.page) searchParams.set("page", params.page);
  if (params.search) searchParams.set("search", params.search);

  const url = `${baseUrl}/api/work-orders${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work orders: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return { workOrders: [], total: 0, page: 1, pageSize: 10 };
  }
}

export default async function WorkOrdersPage({
  searchParams,
}: WorkOrdersPageProps) {
  const data = await getWorkOrders(searchParams);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
        <p className="mt-2 text-gray-600">
          Manage and track all work orders across your organization.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        }
      >
        <WorkOrderListClient
          initialData={data}
          initialFilters={{
            status: searchParams.status || "",
            priority: searchParams.priority || "",
            page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
            search: searchParams.search || "",
          }}
        />
      </Suspense>
    </div>
  );
}
