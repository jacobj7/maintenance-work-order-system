export type UserRole = "admin" | "technician" | "requester" | "viewer";

export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

export type WorkOrderType =
  | "corrective"
  | "preventive"
  | "inspection"
  | "emergency";

export type AssetStatus =
  | "active"
  | "inactive"
  | "under_maintenance"
  | "retired";

export type LocationType = "building" | "floor" | "room" | "area" | "zone";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parent_id?: string;
  parent?: Location;
  children?: Location[];
  address?: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Asset {
  id: string;
  name: string;
  asset_tag: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  status: AssetStatus;
  location_id?: string;
  location?: Location;
  purchase_date?: Date;
  purchase_cost?: number;
  warranty_expiry?: Date;
  last_maintenance_date?: Date;
  next_maintenance_date?: Date;
  specifications?: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkOrder {
  id: string;
  work_order_number: string;
  title: string;
  description?: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  asset_id?: string;
  asset?: Asset;
  location_id?: string;
  location?: Location;
  requested_by_id: string;
  requested_by?: User;
  assigned_to?: Assignment[];
  due_date?: Date;
  scheduled_start?: Date;
  scheduled_end?: Date;
  actual_start?: Date;
  actual_end?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  notes?: string;
  attachments?: Attachment[];
  status_updates?: StatusUpdate[];
  parts_costs?: PartsCost[];
  labor_entries?: LaborEntry[];
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Assignment {
  id: string;
  work_order_id: string;
  work_order?: WorkOrder;
  user_id: string;
  user?: User;
  role?: string;
  assigned_at: Date;
  assigned_by_id?: string;
  assigned_by?: User;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StatusUpdate {
  id: string;
  work_order_id: string;
  work_order?: WorkOrder;
  previous_status?: WorkOrderStatus;
  new_status: WorkOrderStatus;
  comment?: string;
  updated_by_id: string;
  updated_by?: User;
  created_at: Date;
}

export interface PartsCost {
  id: string;
  work_order_id: string;
  work_order?: WorkOrder;
  part_name: string;
  part_number?: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  purchase_date?: Date;
  added_by_id?: string;
  added_by?: User;
  created_at: Date;
  updated_at: Date;
}

export interface LaborEntry {
  id: string;
  work_order_id: string;
  work_order?: WorkOrder;
  user_id: string;
  user?: User;
  description?: string;
  hours: number;
  hourly_rate?: number;
  total_cost?: number;
  work_date: Date;
  start_time?: string;
  end_time?: string;
  is_overtime: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Attachment {
  id: string;
  work_order_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  uploaded_by_id?: string;
  uploaded_by?: User;
  created_at: Date;
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  type?: WorkOrderType | WorkOrderType[];
  asset_id?: string;
  location_id?: string;
  assigned_to?: string;
  requested_by?: string;
  due_date_from?: Date;
  due_date_to?: Date;
  created_from?: Date;
  created_to?: Date;
  search?: string;
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DashboardStats {
  total_work_orders: number;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  overdue_work_orders: number;
  critical_work_orders: number;
  total_assets: number;
  assets_under_maintenance: number;
  total_labor_hours: number;
  total_parts_cost: number;
  total_labor_cost: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
