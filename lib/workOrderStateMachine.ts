export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

const allowedTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open: ["assigned", "cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
): boolean {
  const allowed = allowedTransitions[from];
  return allowed.includes(to);
}

export function getAllowedTransitions(
  status: WorkOrderStatus,
): WorkOrderStatus[] {
  return allowedTransitions[status];
}
