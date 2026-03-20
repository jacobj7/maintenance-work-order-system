export type UserRole = "admin" | "manager" | "technician" | "viewer";

export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

export type AssetStatus = "active" | "inactive" | "maintenance" | "retired";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  parentLocationId?: string | null;
  parentLocation?: Location | null;
  children?: Location[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  description?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  purchaseDate?: Date | null;
  warrantyExpiry?: Date | null;
  status: AssetStatus;
  locationId?: string | null;
  location?: Location | null;
  parentAssetId?: string | null;
  parentAsset?: Asset | null;
  children?: Asset[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrder {
  id: string;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  assetId?: string | null;
  asset?: Asset | null;
  locationId?: string | null;
  location?: Location | null;
  createdById: string;
  createdBy?: User | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  assignments?: Assignment[];
  statusEvents?: StatusEvent[];
  partsLogs?: PartsLog[];
  laborLogs?: LaborLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder | null;
  userId: string;
  user?: User | null;
  assignedById: string;
  assignedBy?: User | null;
  assignedAt: Date;
  notes?: string | null;
}

export interface StatusEvent {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder | null;
  fromStatus?: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  changedById: string;
  changedBy?: User | null;
  reason?: string | null;
  createdAt: Date;
}

export interface PartsLog {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder | null;
  partName: string;
  partNumber?: string | null;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  supplier?: string | null;
  notes?: string | null;
  loggedById: string;
  loggedBy?: User | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LaborLog {
  id: string;
  workOrderId: string;
  workOrder?: WorkOrder | null;
  userId: string;
  user?: User | null;
  hoursWorked: number;
  hourlyRate?: number | null;
  totalCost?: number | null;
  workDate: Date;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
