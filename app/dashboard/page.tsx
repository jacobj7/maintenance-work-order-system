import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import DashboardClient from "@/components/DashboardClient";

interface WorkOrderRow {
  id: number;
  title: string;
  status: string;
  priority: string;
  location: string;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
}

interface StatsRow {
  total_work_orders: string;
  open_work_orders: string;
  in_progress_work_orders: string;
  completed_work_orders: string;
  high_priority_work_orders: string;
  facilities_count: string;
}

export interface SerializedWorkOrder {
  id: number;
  title: string;
  status: string;
  priority: string;
  location: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalWorkOrders: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  highPriorityWorkOrders: number;
  facilitiesCount: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const result = await query<StatsRow>(`
      SELECT
        (SELECT COUNT(*) FROM work_orders) AS total_work_orders,
        (SELECT COUNT(*) FROM work_orders WHERE status = 'open') AS open_work_orders,
        (SELECT COUNT(*) FROM work_orders WHERE status = 'in_progress') AS in_progress_work_orders,
        (SELECT COUNT(*) FROM work_orders WHERE status = 'completed') AS completed_work_orders,
        (SELECT COUNT(*) FROM work_orders WHERE priority = 'high') AS high_priority_work_orders,
        (SELECT COUNT(*) FROM facilities) AS facilities_count
    `);

    const row = result.rows[0];

    return {
      totalWorkOrders: parseInt(row.total_work_orders, 10) || 0,
      openWorkOrders: parseInt(row.open_work_orders, 10) || 0,
      inProgressWorkOrders: parseInt(row.in_progress_work_orders, 10) || 0,
      completedWorkOrders: parseInt(row.completed_work_orders, 10) || 0,
      highPriorityWorkOrders: parseInt(row.high_priority_work_orders, 10) || 0,
      facilitiesCount: parseInt(row.facilities_count, 10) || 0,
    };
  } catch {
    return {
      totalWorkOrders: 0,
      openWorkOrders: 0,
      inProgressWorkOrders: 0,
      completedWorkOrders: 0,
      highPriorityWorkOrders: 0,
      facilitiesCount: 0,
    };
  }
}

async function fetchRecentWorkOrders(): Promise<SerializedWorkOrder[]> {
  try {
    const result = await query<WorkOrderRow>(`
      SELECT
        id,
        title,
        status,
        priority,
        location,
        assigned_to,
        created_at,
        updated_at
      FROM work_orders
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      location: row.location,
      assigned_to: row.assigned_to,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const [stats, recentWorkOrders] = await Promise.all([
    fetchDashboardStats(),
    fetchRecentWorkOrders(),
  ]);

  return (
    <DashboardClient
      stats={stats}
      recentWorkOrders={recentWorkOrders}
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
