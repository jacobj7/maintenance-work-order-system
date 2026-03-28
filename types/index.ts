export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  floor: string | null;
  room: string | null;
  building: string | null;
  created_at: string;
  updated_at: string;
  facility?: Facility;
}

export interface Asset {
  id: string;
  facility_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  asset_tag: string | null;
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  category: string;
  status: string;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  facility?: Facility;
  location?: Location;
}

export interface WorkOrder {
  id: string;
  facility_id: string;
  asset_id: string | null;
  location_id: string | null;
  assigned_to: string | null;
  created_by: string;
  title: string;
  description: string | null;
  work_order_number: string;
  type: string;
  priority: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  facility?: Facility;
  asset?: Asset;
  location?: Location;
  assigned_user?: User;
  created_user?: User;
  status_history?: StatusHistory[];
}

export interface StatusHistory {
  id: string;
  work_order_id: string;
  changed_by: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  user?: User;
}

export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  type?: string;
  facility_id?: string;
  asset_id?: string;
  assigned_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssetFilters {
  status?: string;
  category?: string;
  facility_id?: string;
  location_id?: string;
  search?: string;
  page?: number;
  limit?: number;
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
  total_assets: number;
  active_assets: number;
  assets_under_maintenance: number;
  total_facilities: number;
}

export interface AIAnalysis {
  summary: string;
  recommendations: string[];
  priority_assessment: string;
  estimated_resolution_time: string;
  potential_causes: string[];
}
