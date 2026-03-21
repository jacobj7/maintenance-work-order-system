export type WorkOrderStatus =
  | "open"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type WorkOrderPriority = "low" | "medium" | "high" | "critical";

export type WorkOrderCategory =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "structural"
  | "equipment"
  | "safety"
  | "cleaning"
  | "landscaping"
  | "it"
  | "other";

export type UserRole = "admin" | "manager" | "technician" | "requester";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  department?: string | null;
  phone?: string | null;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  room?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  requestedById: string;
  requestedBy?: User;
  assignedToId?: string | null;
  assignedTo?: User | null;
  locationId?: string | null;
  location?: Location | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  dueDate?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  workOrderId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedBy?: User;
  createdAt: Date;
}

export interface Comment {
  id: string;
  workOrderId: string;
  authorId: string;
  author?: User;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  category?: WorkOrderCategory | WorkOrderCategory[];
  assignedToId?: string;
  requestedById?: string;
  locationId?: string;
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
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

export interface WorkOrderStats {
  total: number;
  open: number;
  inProgress: number;
  onHold: number;
  completed: number;
  cancelled: number;
  overdue: number;
  criticalOpen: number;
}

export interface AIAnalysis {
  suggestedPriority: WorkOrderPriority;
  suggestedCategory: WorkOrderCategory;
  estimatedHours: number;
  summary: string;
  recommendations: string[];
  riskFactors: string[];
}

export interface CreateWorkOrderInput {
  title: string;
  description: string;
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  locationId?: string;
  assignedToId?: string;
  estimatedHours?: number;
  estimatedCost?: number;
  dueDate?: Date;
  notes?: string;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  category?: WorkOrderCategory;
  locationId?: string | null;
  assignedToId?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  dueDate?: Date | null;
  notes?: string | null;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  image?: string | null;
}
