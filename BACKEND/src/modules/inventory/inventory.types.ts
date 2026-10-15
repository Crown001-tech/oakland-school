export type InventoryCategory =
  | 'stationery'
  | 'science_lab'
  | 'sports'
  | 'it_hardware'
  | 'medical'
  | 'textbooks'
  | 'maintenance';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  location: string;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProcurementUrgency = 'low' | 'medium' | 'critical';
export type ProcurementStatus =
  | 'pending_principal'
  | 'pending_proprietor'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'delivered';

export interface ProcurementRequest {
  id: string;
  itemName: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  urgency: ProcurementUrgency;
  justification: string;
  requestedById?: string;
  requestedByName: string;
  status: ProcurementStatus;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemDTO {
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  reorderLevel?: number;
  unitCost: number;
  location?: string;
}

export interface CreateProcurementRequestDTO {
  itemName: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  urgency?: ProcurementUrgency;
  justification: string;
  requestedByName: string;
}

export interface ReviewProcurementDTO {
  decision: 'approve' | 'reject';
  reviewerName: string;
  reviewerRole: 'admin' | 'proprietor';
  notes?: string;
}
