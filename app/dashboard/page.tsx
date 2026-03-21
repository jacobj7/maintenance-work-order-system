import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

async function getDashboardSummary() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/dashboard/summary`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch dashboard summary: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  let summary = null;
  let error: string | null = null;

  try {
    summary = await getDashboardSummary();
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load dashboard data";
  }

  const serializedSummary = summary
    ? JSON.parse(JSON.stringify(summary))
    : null;

  return (
    <DashboardClient
      summary={serializedSummary}
      error={error}
      user={{
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
      }}
    />
  );
}
