import { notFound } from "next/navigation";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

interface WorkOrderDetailPageProps {
  params: { id: string };
}

async function getWorkOrder(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/work-orders/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch work order: ${res.statusText}`);
  }

  return res.json();
}

function serializeWorkOrder(
  workOrder: Record<string, unknown>,
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(workOrder)) {
    if (value === null || value === undefined) {
      serialized[key] = null;
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (typeof value === "object" && !Array.isArray(value)) {
      serialized[key] = serializeWorkOrder(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      serialized[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? serializeWorkOrder(item as Record<string, unknown>)
          : item,
      );
    } else {
      serialized[key] = value;
    }
  }

  return serialized;
}

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const workOrder = await getWorkOrder(params.id);

  if (!workOrder) {
    notFound();
  }

  const serializedWorkOrder = serializeWorkOrder(workOrder);

  return <WorkOrderDetailClient workOrder={serializedWorkOrder} />;
}
