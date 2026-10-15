import {
  InventoryItem,
  ProcurementRequest,
  CreateInventoryItemDTO,
  CreateProcurementRequestDTO,
  ReviewProcurementDTO,
} from './inventory.types.js';
import { prisma } from '../../config/prisma.js';
import { EventBus } from '../../common/events/event-bus.js';
import { AppEvents, ProcurementRequestPayload } from '../../common/events/event-types.js';
import crypto from 'crypto';

export class InventoryService {
  private static instance: InventoryService;

  // In-memory data store (clean start for real operations)
  private items: InventoryItem[] = [];
  private requests: ProcurementRequest[] = [];


  public static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  /**
   * Fetch all inventory items with optional category or low stock filtering
   */
  async getInventory(filters?: { category?: string; lowStockOnly?: boolean; search?: string }): Promise<InventoryItem[]> {
    let result = [...this.items];

    if (filters?.category && filters.category !== 'all') {
      result = result.filter((i) => i.category === filters.category);
    }

    if (filters?.lowStockOnly) {
      result = result.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
    }

    return result;
  }

  /**
   * Add a new inventory item
   */
  async createInventoryItem(dto: CreateInventoryItemDTO): Promise<InventoryItem> {
    const reorderLevel = dto.reorderLevel ?? 10;
    const status = dto.quantity === 0 ? 'out_of_stock' : dto.quantity <= reorderLevel ? 'low_stock' : 'in_stock';

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name: dto.name,
      category: dto.category,
      quantity: dto.quantity,
      unit: dto.unit,
      reorderLevel,
      unitCost: dto.unitCost,
      location: dto.location || 'Main Central Store',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.items.unshift(newItem);

    try {
      await prisma.inventoryItem.create({
        data: {
          id: newItem.id,
          name: newItem.name,
          category: newItem.category,
          quantity: newItem.quantity,
          unit: newItem.unit,
          reorderLevel: newItem.reorderLevel,
          unitCost: newItem.unitCost,
          location: newItem.location,
          status: newItem.status,
        },
      });
    } catch {}

    return newItem;
  }

  /**
   * Adjust inventory stock levels
   */
  async adjustStock(id: string, delta: number): Promise<InventoryItem> {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Inventory item ${id} not found.`);
    }

    item.quantity = Math.max(0, item.quantity + delta);
    item.status = item.quantity === 0 ? 'out_of_stock' : item.quantity <= item.reorderLevel ? 'low_stock' : 'in_stock';
    item.updatedAt = new Date().toISOString();

    try {
      await prisma.inventoryItem.update({
        where: { id },
        data: { quantity: item.quantity, status: item.status, updatedAt: new Date(item.updatedAt) },
      });
    } catch {}

    return item;
  }

  /**
   * Fetch procurement requests
   */
  async getProcurementRequests(filters?: { status?: string; urgency?: string }): Promise<ProcurementRequest[]> {
    let result = [...this.requests];

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters?.urgency && filters.urgency !== 'all') {
      result = result.filter((r) => r.urgency === filters.urgency);
    }

    // Newest first
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Submit a new procurement requisition
   */
  async submitProcurementRequest(
    dto: CreateProcurementRequestDTO,
    requestedById?: string
  ): Promise<ProcurementRequest> {
    const totalCost = dto.quantity * dto.estimatedUnitCost;

    const newReq: ProcurementRequest = {
      id: crypto.randomUUID(),
      itemName: dto.itemName,
      category: dto.category,
      quantity: dto.quantity,
      unit: dto.unit,
      estimatedUnitCost: dto.estimatedUnitCost,
      estimatedTotalCost: totalCost,
      urgency: dto.urgency || 'medium',
      justification: dto.justification,
      requestedById,
      requestedByName: dto.requestedByName,
      status: 'pending_principal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.requests.unshift(newReq);

    try {
      await prisma.procurementRequest.create({
        data: {
          id: newReq.id,
          itemName: newReq.itemName,
          category: newReq.category,
          quantity: newReq.quantity,
          unit: newReq.unit,
          estimatedUnitCost: newReq.estimatedUnitCost,
          estimatedTotalCost: newReq.estimatedTotalCost,
          urgency: newReq.urgency,
          justification: newReq.justification,
          requestedById: newReq.requestedById || undefined,
          requestedByName: newReq.requestedByName,
          status: newReq.status,
        },
      });
    } catch {}

    // Emit event
    const payload: ProcurementRequestPayload = {
      requestId: newReq.id,
      itemName: newReq.itemName,
      category: newReq.category,
      quantity: newReq.quantity,
      totalCost: newReq.estimatedTotalCost,
      requestedBy: newReq.requestedByName,
      urgency: newReq.urgency,
      status: newReq.status,
    };

    EventBus.getInstance().publish(
      AppEvents.PROCUREMENT_REQUEST_SUBMITTED,
      payload,
      { source: 'InventoryService' }
    );

    return newReq;
  }

  /**
   * Review and advance procurement request in governance workflow
   */
  async reviewProcurementRequest(id: string, dto: ReviewProcurementDTO): Promise<ProcurementRequest> {
    const req = this.requests.find((r) => r.id === id);
    if (!req) {
      throw new Error(`Procurement request ${id} not found.`);
    }

    if (dto.decision === 'reject') {
      req.status = 'rejected';
      req.approvedBy = dto.reviewerName;
      req.approvalNotes = dto.notes || 'Declined during administrative review.';
    } else {
      // If approved by Principal and cost > ₦100,000 -> forward to Proprietor
      if (dto.reviewerRole === 'admin' && req.estimatedTotalCost > 100000) {
        req.status = 'pending_proprietor';
        req.approvedBy = `Endorsed by ${dto.reviewerName}`;
        req.approvalNotes = dto.notes || 'Endorsed by Principal. Forwarded to Proprietor for capital approval.';
      } else {
        req.status = 'approved';
        req.approvedBy = dto.reviewerName;
        req.approvalNotes = dto.notes || 'Approved. Requisition committed to Bursary for purchase.';
      }
    }

    req.updatedAt = new Date().toISOString();

    try {
      await prisma.procurementRequest.update({
        where: { id },
        data: {
          status: req.status,
          approvedBy: req.approvedBy || undefined,
          approvalNotes: req.approvalNotes,
          updatedAt: new Date(req.updatedAt),
        },
      });
    } catch {}

    const payload: ProcurementRequestPayload = {
      requestId: req.id,
      itemName: req.itemName,
      category: req.category,
      quantity: req.quantity,
      totalCost: req.estimatedTotalCost,
      requestedBy: req.requestedByName,
      urgency: req.urgency,
      status: req.status,
    };

    EventBus.getInstance().publish(
      AppEvents.PROCUREMENT_STATUS_CHANGED,
      payload,
      { source: 'InventoryService' }
    );

    return req;
  }

  /**
   * Mark procurement as delivered & automatically update inventory stock
   */
  async markDelivered(id: string): Promise<{ request: ProcurementRequest; inventoryItem: InventoryItem }> {
    const req = this.requests.find((r) => r.id === id);
    if (!req) {
      throw new Error(`Procurement request ${id} not found.`);
    }

    req.status = 'delivered';
    req.updatedAt = new Date().toISOString();

    // Check if item exists in inventory or create it
    let item = this.items.find((i) => i.name.toLowerCase() === req.itemName.toLowerCase());
    if (item) {
      item.quantity += req.quantity;
      item.status = item.quantity <= item.reorderLevel ? 'low_stock' : 'in_stock';
      item.updatedAt = new Date().toISOString();
    } else {
      item = await this.createInventoryItem({
        name: req.itemName,
        category: req.category,
        quantity: req.quantity,
        unit: req.unit,
        unitCost: req.estimatedUnitCost,
      });
    }

    return { request: req, inventoryItem: item };
  }
}
