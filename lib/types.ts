export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "technician" | "requester" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  parentLocationId: string | null;
  parentLocation?: Location;
  children?: Location[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  assetTag: string | null;
  serialNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  purchaseDate: Date | null;
  purchaseCost: number | null;
  warrantyExpiry: Date | null;
  status: "active" | "inactive" | "under_maintenance" | "retired";
  locationId: string | null;
  location?: Location;
  parentAssetId: string | null;
  parentAsset?: Asset;
  children?: Asset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: "corrective" | "preventive" | "inspection" | "emergency";
  assetId: string | null;
  asset?: Asset;
  locationId: string | null;
  location?: Location;
  assignedToId: string | null;
  assignedTo?: User;
  requestedById: string;
  requestedBy?: User;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  estimatedHours: number | null;
  actualHours: number | null;
  notes: string | null;
  completionNotes: string | null;
  statusHistory?: StatusHistory[];
  parts?: WorkOrderPart[];
  laborEntries?: LaborEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusHistory {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedById: string;
  changedBy?: User;
  reason: string | null;
  createdAt: Date;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  partName: string;
  partNumber: string | null;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborEntry {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder;
  technicianId: string;
  technician?: User;
  hoursWorked: number;
  hourlyRate: number | null;
  totalCost: number | null;
  workDate: Date;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceSchedule {
  id: string;
  name: string;
  description: string | null;
  assetId: string | null;
  asset?: Asset;
  locationId: string | null;
  location?: Location;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  frequencyValue: number | null;
  frequencyUnit: "days" | "weeks" | "months" | "years" | null;
  type: "corrective" | "preventive" | "inspection" | "emergency";
  priority: WorkOrderPriority;
  estimatedHours: number | null;
  assignedToId: string | null;
  assignedTo?: User;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  isActive: boolean;
  templateNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
