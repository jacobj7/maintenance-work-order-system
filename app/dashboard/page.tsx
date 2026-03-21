import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import DashboardClient from "./DashboardClient";

interface SummaryData {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  activeProjects: number;
}

async function fetchSummaryData(): Promise<SummaryData> {
  try {
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/dashboard/summary`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch summary data: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return {
      totalUsers: 0,
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      activeProjects: 0,
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const summaryData = await fetchSummaryData();

  const totalUsers: number = Number(summaryData.totalUsers) || 0;
  const totalProjects: number = Number(summaryData.totalProjects) || 0;
  const totalTasks: number = Number(summaryData.totalTasks) || 0;
  const completedTasks: number = Number(summaryData.completedTasks) || 0;
  const pendingTasks: number = Number(summaryData.pendingTasks) || 0;
  const activeProjects: number = Number(summaryData.activeProjects) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient
          totalUsers={totalUsers}
          totalProjects={totalProjects}
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          pendingTasks={pendingTasks}
          activeProjects={activeProjects}
        />
      </main>
    </div>
  );
}
