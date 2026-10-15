import { Request, Response } from 'express';
import { InventoryService } from './inventory.service.js';

export class InventoryController {
  private inventoryService = InventoryService.getInstance();

  /**
   * GET /api/v1/inventory
   */
  getInventory = async (req: Request, res: Response) => {
    try {
      const { category, lowStock, search } = req.query;
      const items = await this.inventoryService.getInventory({
        category: category as string,
        lowStockOnly: lowStock === 'true',
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: items,
        count: items.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/inventory
   */
  createInventoryItem = async (req: Request, res: Response) => {
    try {
      const { name, category, quantity, unit, unitCost } = req.body;
      if (!name || !category || quantity === undefined || !unit || unitCost === undefined) {
        return res.status(400).json({
          success: false,
          message: 'name, category, quantity, unit, and unitCost are required.',
        });
      }

      const item = await this.inventoryService.createInventoryItem(req.body);
      res.status(201).json({
        success: true,
        message: 'Item registered into institutional inventory.',
        data: item,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PATCH /api/v1/inventory/:id/adjust-stock
   */
  adjustStock = async (req: Request, res: Response) => {
    try {
      const { delta } = req.body;
      if (delta === undefined) {
        return res.status(400).json({ success: false, message: 'delta is required.' });
      }

      const item = await this.inventoryService.adjustStock(req.params.id, Number(delta));
      res.status(200).json({
        success: true,
        message: 'Stock level updated.',
        data: item,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/inventory/procurement
   */
  getProcurementRequests = async (req: Request, res: Response) => {
    try {
      const { status, urgency } = req.query;
      const requests = await this.inventoryService.getProcurementRequests({
        status: status as string,
        urgency: urgency as string,
      });

      res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/inventory/procurement
   */
  submitProcurementRequest = async (req: Request, res: Response) => {
    try {
      const { itemName, category, quantity, unit, estimatedUnitCost, justification, requestedByName } = req.body;
      if (!itemName || !category || !quantity || !unit || !estimatedUnitCost || !justification) {
        return res.status(400).json({
          success: false,
          message: 'itemName, category, quantity, unit, estimatedUnitCost, and justification are required.',
        });
      }

      const reqUser = (req as any).user;
      const request = await this.inventoryService.submitProcurementRequest(
        {
          ...req.body,
          requestedByName: requestedByName || reqUser?.fullName || 'Staff Requester',
        },
        reqUser?.id
      );

      res.status(201).json({
        success: true,
        message: 'Requisition submitted and routed to Principal for endorsement.',
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PATCH /api/v1/inventory/procurement/:id/review
   */
  reviewProcurementRequest = async (req: Request, res: Response) => {
    try {
      const { decision, notes } = req.body;
      if (!decision || !['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ success: false, message: 'decision must be "approve" or "reject".' });
      }

      const reqUser = (req as any).user;
      const reviewerRole = (reqUser?.role === 'proprietor' ? 'proprietor' : 'admin') as any;
      const reviewerName = reqUser?.fullName || (reviewerRole === 'proprietor' ? 'Proprietor' : 'Principal');

      const updated = await this.inventoryService.reviewProcurementRequest(req.params.id, {
        decision,
        reviewerName,
        reviewerRole,
        notes,
      });

      res.status(200).json({
        success: true,
        message: `Requisition ${decision === 'approve' ? 'approved' : 'rejected'}.`,
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PATCH /api/v1/inventory/procurement/:id/delivered
   */
  markDelivered = async (req: Request, res: Response) => {
    try {
      const result = await this.inventoryService.markDelivered(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Items received and automatically restocked in inventory ledger.',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
