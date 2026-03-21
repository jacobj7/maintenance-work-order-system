import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import TechnicianClient from "./TechnicianClient";

export interface WorkOrder {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "completed" | "cancelled";
  assigned_to: string;
  customer_name: string;
  customer_email: string;
  location: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default async function TechnicianPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const technicianId = session.user.id || session.user.email;

  let workOrders: WorkOrder[] = [];

  try {
    const client = await pool.connect();
    try {
      const result = await client.query<WorkOrder>(
        `SELECT
          id,
          title,
          description,
          priority,
          status,
          assigned_to,
          customer_name,
          customer_email,
          location,
          scheduled_date,
          created_at,
          updated_at
        FROM work_orders
        WHERE assigned_to = $1
          AND status NOT IN ('completed', 'cancelled')
        ORDER BY
          CASE priority
            WHEN 'urgent' THEN 0
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END ASC,
          created_at ASC`,
        [technicianId],
      );

      workOrders = result.rows.map((row) => ({
        ...row,
        scheduled_date: row.scheduled_date
          ? new Date(row.scheduled_date).toISOString()
          : null,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to fetch work orders:", error);
    workOrders = [];
  }

  const serializedUser = {
    id: session.user.id ?? "",
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };

  return <TechnicianClient workOrders={workOrders} user={serializedUser} />;
}
