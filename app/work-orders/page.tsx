import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import WorkOrderListClient from "./WorkOrderListClient";

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

async function getWorkOrders(
  searchParams: Record<string, string>,
): Promise<WorkOrder[]> {
  const session = await getServerSession();
  if (!session) {
    return [];
  }

  const params = new URLSearchParams();
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.priority) params.set("priority", searchParams.priority);
  if (searchParams.assignedTo)
    params.set("assignedTo", searchParams.assignedTo);
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.page) params.set("page", searchParams.page);
  if (searchParams.limit) params.set("limit", searchParams.limit);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/work-orders${params.toString() ? `?${params.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${(session as any)?.sessionToken || ""}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch work orders:", response.statusText);
      return [];
    }

    const data = await response.json();
    const workOrders = Array.isArray(data) ? data : data.workOrders || [];

    return workOrders.map((wo: any) => ({
      id: String(wo.id),
      title: String(wo.title || ""),
      description: wo.description ? String(wo.description) : null,
      status: String(wo.status || ""),
      priority: String(wo.priority || ""),
      assignedTo: wo.assignedTo ? String(wo.assignedTo) : null,
      createdBy: String(wo.createdBy || ""),
      createdAt: wo.createdAt
        ? new Date(wo.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: wo.updatedAt
        ? new Date(wo.updatedAt).toISOString()
        : new Date().toISOString(),
      dueDate: wo.dueDate ? new Date(wo.dueDate).toISOString() : null,
    }));
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return [];
  }
}

interface PageProps {
  searchParams?: Record<string, string>;
}

export default async function WorkOrdersPage({ searchParams = {} }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const workOrders = await getWorkOrders(searchParams);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="mt-2 text-gray-600">Manage and track all work orders</p>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          }
        >
          <WorkOrderListClient
            workOrders={workOrders}
            searchParams={searchParams}
          />
        </Suspense>
      </main>
    </div>
  );
}
