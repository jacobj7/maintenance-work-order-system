export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";
export type WorkOrderPriority = "low" | "medium" | "high" | "critical";
export type UserRole = "admin" | "technician" | "requester";
export type AssetStatus = "active" | "inactive" | "maintenance" | "retired";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address?: string | null;
  parent_location_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Asset {
  id: string;
  organization_id: string;
  location_id?: string | null;
  name: string;
  description?: string | null;
  asset_tag?: string | null;
  serial_number?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  status: AssetStatus;
  purchase_date?: Date | null;
  warranty_expiry?: Date | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  location?: Location | null;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  asset_id?: string | null;
  location_id?: string | null;
  requester_id?: string | null;
  assignee_id?: string | null;
  due_date?: Date | null;
  completed_at?: Date | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  asset?: Asset | null;
  location?: Location | null;
  requester?: User | null;
  assignee?: User | null;
  status_updates?: StatusUpdate[];
}

export interface StatusUpdate {
  id: string;
  work_order_id: string;
  user_id?: string | null;
  old_status?: WorkOrderStatus | null;
  new_status: WorkOrderStatus;
  comment?: string | null;
  ai_generated?: boolean;
  created_at: Date;
  user?: User | null;
}

export interface TechnicianWithCount {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: UserRole;
  organization_id: string;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  total_work_orders: number;
  created_at: Date;
  updated_at: Date;
}

export interface DashboardSummary {
  total_work_orders: number;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  cancelled_work_orders: number;
  critical_work_orders: number;
  high_priority_work_orders: number;
  overdue_work_orders: number;
  total_assets: number;
  active_assets: number;
  assets_in_maintenance: number;
  total_technicians: number;
  recent_work_orders: WorkOrder[];
  work_orders_by_priority: {
    priority: WorkOrderPriority;
    count: number;
  }[];
  work_orders_by_status: {
    status: WorkOrderStatus;
    count: number;
  }[];
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  assignee_id?: string;
  requester_id?: string;
  asset_id?: string;
  location_id?: string;
  search?: string;
  due_before?: Date;
  due_after?: Date;
  page?: number;
  limit?: number;
  sort_by?: keyof WorkOrder;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
