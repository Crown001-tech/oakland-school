import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

// Inventory Stock endpoints
router.get('/', requirePermission(Permissions.INVENTORY_VIEW), controller.getInventory);
router.post('/', requirePermission(Permissions.INVENTORY_MANAGE), controller.createInventoryItem);
router.patch('/:id/adjust-stock', requirePermission(Permissions.INVENTORY_MANAGE), controller.adjustStock);

// Procurement Requisition endpoints
router.get('/procurement', requirePermission(Permissions.PROCUREMENT_VIEW), controller.getProcurementRequests);
router.post('/procurement', requirePermission(Permissions.PROCUREMENT_REQUEST), controller.submitProcurementRequest);
router.patch('/procurement/:id/review', requirePermission(Permissions.PROCUREMENT_APPROVE), controller.reviewProcurementRequest);
router.patch('/procurement/:id/delivered', requirePermission(Permissions.INVENTORY_MANAGE), controller.markDelivered);

export default router;
