import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

interface DashboardSummary {
  totalWorkOrders: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  totalAssets: number;
  totalTechnicians: number;
}

async function getDashboardSummary(): Promise<DashboardSummary | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/dashboard/summary`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch dashboard summary:", response.statusText);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return null;
  }
}

interface SummaryCardProps {
  title: string;
  value: number;
  color: string;
  icon: string;
}

function SummaryCard({ title, value, color, icon }: SummaryCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const summary = await getDashboardSummary();

  const defaultSummary: DashboardSummary = {
    totalWorkOrders: 0,
    openWorkOrders: 0,
    inProgressWorkOrders: 0,
    completedWorkOrders: 0,
    totalAssets: 0,
    totalTechnicians: 0,
  };

  const data = summary || defaultSummary;

  const cards: SummaryCardProps[] = [
    {
      title: "Total Work Orders",
      value: data.totalWorkOrders,
      color: "border-blue-500",
      icon: "📋",
    },
    {
      title: "Open",
      value: data.openWorkOrders,
      color: "border-yellow-500",
      icon: "🔓",
    },
    {
      title: "In Progress",
      value: data.inProgressWorkOrders,
      color: "border-orange-500",
      icon: "⚙️",
    },
    {
      title: "Completed",
      value: data.completedWorkOrders,
      color: "border-green-500",
      icon: "✅",
    },
    {
      title: "Total Assets",
      value: data.totalAssets,
      color: "border-purple-500",
      icon: "🏭",
    },
    {
      title: "Technicians",
      value: data.totalTechnicians,
      color: "border-indigo-500",
      icon: "👷",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session.user?.name || session.user?.email}
          </p>
        </div>

        {!summary && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-700">
              Unable to load dashboard data. Showing default values.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <SummaryCard
              key={card.title}
              title={card.title}
              value={card.value}
              color={card.color}
              icon={card.icon}
            />
          ))}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Overview
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {data.totalWorkOrders > 0
                  ? `${Math.round(
                      (data.completedWorkOrders / data.totalWorkOrders) * 100,
                    )}%`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active Work Orders</span>
              <span className="text-sm font-medium text-gray-900">
                {data.openWorkOrders + data.inProgressWorkOrders}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">
                Assets per Technician
              </span>
              <span className="text-sm font-medium text-gray-900">
                {data.totalTechnicians > 0
                  ? (data.totalAssets / data.totalTechnicians).toFixed(1)
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
