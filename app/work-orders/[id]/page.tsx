import { notFound } from "next/navigation";
import WorkOrderDetailClient from "./WorkOrderDetailClient";

interface WorkOrderDetailPageProps {
  params: { id: string };
}

async function getWorkOrder(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
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

async function getTechnicians() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/technicians`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const { id } = params;

  const [workOrderData, techniciansData] = await Promise.all([
    getWorkOrder(id),
    getTechnicians(),
  ]);

  if (!workOrderData) {
    notFound();
  }

  const workOrder = workOrderData.workOrder ?? workOrderData;
  const technicians = techniciansData.technicians ?? techniciansData ?? [];

  const serializedWorkOrder = JSON.parse(JSON.stringify(workOrder));
  const serializedTechnicians = JSON.parse(JSON.stringify(technicians));

  return (
    <WorkOrderDetailClient
      workOrder={serializedWorkOrder}
      technicians={serializedTechnicians}
    />
  );
}
