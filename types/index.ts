export type UserRole = "admin" | "technician" | "viewer";

export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

export type AssetStatus = "active" | "inactive" | "maintenance" | "retired";

export type ScheduleFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: Date | null;
  image: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  parent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  purchase_date: Date | null;
  purchase_cost: number | null;
  warranty_expiry: Date | null;
  status: AssetStatus;
  location_id: string | null;
  parent_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  asset_id: string | null;
  location_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  due_date: Date | null;
  completed_at: Date | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StatusHistory {
  id: string;
  work_order_id: string;
  changed_by: string | null;
  old_status: WorkOrderStatus | null;
  new_status: WorkOrderStatus;
  comment: string | null;
  created_at: Date;
}

export interface Attachment {
  id: string;
  work_order_id: string | null;
  asset_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: Date;
}

export interface PreventiveSchedule {
  id: string;
  title: string;
  description: string | null;
  asset_id: string | null;
  location_id: string | null;
  assigned_to: string | null;
  frequency: ScheduleFrequency;
  interval_value: number;
  last_run_at: Date | null;
  next_run_at: Date;
  is_active: boolean;
  priority: WorkOrderPriority;
  estimated_hours: number | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkOrderWithRelations extends WorkOrder {
  asset?: Asset | null;
  location?: Location | null;
  assignee?: User | null;
  creator?: User | null;
  status_history?: StatusHistory[];
  attachments?: Attachment[];
}

export interface AssetWithRelations extends Asset {
  location?: Location | null;
  parent?: Asset | null;
  children?: Asset[];
  work_orders?: WorkOrder[];
  attachments?: Attachment[];
}

export interface LocationWithRelations extends Location {
  parent?: Location | null;
  children?: Location[];
  assets?: Asset[];
}

export interface PreventiveScheduleWithRelations extends PreventiveSchedule {
  asset?: Asset | null;
  location?: Location | null;
  assignee?: User | null;
  creator?: User | null;
}

export interface DashboardStats {
  total_work_orders: number;
  open_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  overdue_work_orders: number;
  total_assets: number;
  active_assets: number;
  assets_in_maintenance: number;
  total_locations: number;
  upcoming_schedules: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
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

export interface WorkOrderFilters {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  assigned_to?: string;
  asset_id?: string;
  location_id?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}

export interface AssetFilters {
  status?: AssetStatus;
  location_id?: string;
  manufacturer?: string;
  search?: string;
}

export interface Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };
  expires: string;
}
