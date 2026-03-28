import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SummaryCard from "@/components/SummaryCard";
import WorkOrderTable from "@/components/WorkOrderTable";
import { format } from "date-fns";

interface SummaryData {
  openCount: number;
  overdueCount: number;
  totalCost: number;
}

interface WorkOrder {
  id: string | number;
  title: string;
  status: string;
  priority: string;
  assignedTo?: string;
  dueDate?: string | Date | null;
  createdAt?: string | Date | null;
  cost?: number | null;
  [key: string]: unknown;
}

interface SerializedWorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string | null;
  createdAt: string | null;
  cost: number | null;
}

function serializeWorkOrder(wo: WorkOrder): SerializedWorkOrder {
  return {
    id: String(wo.id),
    title: wo.title ?? "",
    status: wo.status ?? "",
    priority: wo.priority ?? "",
    assignedTo: wo.assignedTo ?? "",
    dueDate: wo.dueDate
      ? format(new Date(wo.dueDate as string), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      : null,
    createdAt: wo.createdAt
      ? format(new Date(wo.createdAt as string), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      : null,
    cost: wo.cost != null ? Number(wo.cost) : null,
  };
}

async function getSummaryData(baseUrl: string): Promise<SummaryData> {
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/summary`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return { openCount: 0, overdueCount: 0, totalCost: 0 };
    }
    return res.json();
  } catch {
    return { openCount: 0, overdueCount: 0, totalCost: 0 };
  }
}

async function getWorkOrders(baseUrl: string): Promise<WorkOrder[]> {
  try {
    const res = await fetch(`${baseUrl}/api/work-orders`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const baseUrl = getBaseUrl();

  const [summaryData, workOrders] = await Promise.all([
    getSummaryData(baseUrl),
    getWorkOrders(baseUrl),
  ]);

  const serializedWorkOrders: SerializedWorkOrder[] =
    workOrders.map(serializeWorkOrder);

  const formattedTotalCost = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(summaryData.totalCost ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session.user?.name ?? session.user?.email ?? "User"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <SummaryCard
            title="Open Work Orders"
            value={summaryData.openCount ?? 0}
            description="Currently open work orders"
            variant="info"
          />
          <SummaryCard
            title="Overdue Work Orders"
            value={summaryData.overdueCount ?? 0}
            description="Work orders past due date"
            variant="danger"
          />
          <SummaryCard
            title="Total Cost"
            value={formattedTotalCost}
            description="Total cost of all work orders"
            variant="success"
          />
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
          </div>
          <div className="p-6">
            <WorkOrderTable workOrders={serializedWorkOrders} />
          </div>
        </div>
      </div>
    </div>
  );
}
