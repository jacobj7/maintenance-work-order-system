import { Suspense } from "react";
import WorkOrdersClient from "./WorkOrdersClient";

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
}

interface SearchParams {
  status?: string;
  priority?: string;
  page?: string;
}

async function fetchWorkOrders(
  searchParams: SearchParams,
): Promise<WorkOrder[]> {
  const params = new URLSearchParams();

  if (searchParams.status) {
    params.set("status", searchParams.status);
  }
  if (searchParams.priority) {
    params.set("priority", searchParams.priority);
  }
  if (searchParams.page) {
    params.set("page", searchParams.page);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/work-orders${params.toString() ? `?${params.toString()}` : ""}`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch work orders: ${response.statusText}`);
  }

  const data = await response.json();
  return data.workOrders ?? data ?? [];
}

interface PageProps {
  searchParams: SearchParams;
}

export default async function WorkOrdersPage({ searchParams }: PageProps) {
  let workOrders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    workOrders = await fetchWorkOrders(searchParams);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load work orders";
  }

  const serializedWorkOrders = workOrders.map((wo) => ({
    id: wo.id,
    title: wo.title,
    description: wo.description ?? null,
    status: wo.status,
    priority: wo.priority,
    assignee_id: wo.assignee_id ?? null,
    assignee_name: wo.assignee_name ?? null,
    created_at: wo.created_at,
    updated_at: wo.updated_at,
    due_date: wo.due_date ?? null,
  }));

  return (
    <Suspense
      fallback={<div className="p-8 text-center">Loading work orders...</div>}
    >
      <WorkOrdersClient
        workOrders={serializedWorkOrders}
        initialStatus={searchParams.status ?? ""}
        initialPriority={searchParams.priority ?? ""}
        error={error}
      />
    </Suspense>
  );
}
