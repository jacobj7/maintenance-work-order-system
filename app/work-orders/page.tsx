import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import WorkOrdersClient from "@/components/WorkOrdersClient";

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  location: string | null;
  category: string | null;
}

interface SearchParams {
  status?: string;
  priority?: string;
  search?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: string;
}

async function getWorkOrders(searchParams: SearchParams): Promise<{
  workOrders: WorkOrder[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.limit || "20", 10)),
  );
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (searchParams.status) {
    conditions.push(`wo.status = $${paramIndex++}`);
    params.push(searchParams.status);
  }

  if (searchParams.priority) {
    conditions.push(`wo.priority = $${paramIndex++}`);
    params.push(searchParams.priority);
  }

  if (searchParams.search) {
    conditions.push(
      `(wo.title ILIKE $${paramIndex} OR wo.description ILIKE $${paramIndex})`,
    );
    params.push(`%${searchParams.search}%`);
    paramIndex++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const allowedSortColumns: Record<string, string> = {
    id: "wo.id",
    title: "wo.title",
    status: "wo.status",
    priority: "wo.priority",
    created_at: "wo.created_at",
    updated_at: "wo.updated_at",
    due_date: "wo.due_date",
  };

  const sortColumn =
    allowedSortColumns[searchParams.sort || "created_at"] || "wo.created_at";
  const sortOrder =
    searchParams.order?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const dataQuery = `
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.status,
      wo.priority,
      wo.assigned_to,
      assignee.name AS assigned_to_name,
      wo.created_by,
      creator.name AS created_by_name,
      wo.created_at,
      wo.updated_at,
      wo.due_date,
      wo.location,
      wo.category
    FROM work_orders wo
    LEFT JOIN users assignee ON wo.assigned_to = assignee.id::text OR wo.assigned_to = assignee.email
    LEFT JOIN users creator ON wo.created_by = creator.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM work_orders wo
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    query(dataQuery, [...params, limit, offset]),
    query(countQuery, params),
  ]);

  const workOrders: WorkOrder[] = dataResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    assigned_to: row.assigned_to ?? null,
    assigned_to_name: row.assigned_to_name ?? null,
    created_by: row.created_by,
    created_by_name: row.created_by_name ?? null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    due_date: row.due_date
      ? row.due_date instanceof Date
        ? row.due_date.toISOString()
        : String(row.due_date)
      : null,
    location: row.location ?? null,
    category: row.category ?? null,
  }));

  const total = parseInt(countResult.rows[0]?.total || "0", 10);

  return { workOrders, total, page, limit };
}

interface WorkOrdersPageProps {
  searchParams?: SearchParams;
}

export default async function WorkOrdersPage({
  searchParams,
}: WorkOrdersPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const params: SearchParams = {
    status: searchParams?.status,
    priority: searchParams?.priority,
    search: searchParams?.search,
    page: searchParams?.page,
    limit: searchParams?.limit,
    sort: searchParams?.sort,
    order: searchParams?.order,
  };

  const { workOrders, total, page, limit } = await getWorkOrders(params);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading work orders...
        </div>
      }
    >
      <WorkOrdersClient
        workOrders={workOrders}
        total={total}
        page={page}
        limit={limit}
        searchParams={params}
      />
    </Suspense>
  );
}
