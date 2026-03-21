type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";
type UserRole = "Supervisor" | "Technician" | "Admin" | string;

interface TransitionRule {
  from: WorkOrderStatus | "*";
  to: WorkOrderStatus;
  allowedRoles: UserRole[];
}

const transitionRules: TransitionRule[] = [
  {
    from: "open",
    to: "in_progress",
    allowedRoles: ["Supervisor", "Technician"],
  },
  {
    from: "in_progress",
    to: "completed",
    allowedRoles: ["Technician"],
  },
  {
    from: "*",
    to: "cancelled",
    allowedRoles: ["Supervisor"],
  },
];

export function canTransition(
  currentStatus: WorkOrderStatus,
  newStatus: WorkOrderStatus,
  role: UserRole,
): boolean {
  if (currentStatus === newStatus) {
    return false;
  }

  if (currentStatus === "completed" || currentStatus === "cancelled") {
    return false;
  }

  for (const rule of transitionRules) {
    const fromMatches = rule.from === "*" || rule.from === currentStatus;
    const toMatches = rule.to === newStatus;
    const roleAllowed = rule.allowedRoles.includes(role);

    if (fromMatches && toMatches && roleAllowed) {
      return true;
    }
  }

  return false;
}

export type { WorkOrderStatus, UserRole };
