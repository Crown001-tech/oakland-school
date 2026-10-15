import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

// 1. Public Payment Webhook Handler (Paystack / Flutterwave)
router.post('/payments/webhook', FinanceController.handlePaymentWebhook);

// 2. Parent-facing and Checkout Endpoints
router.get('/accounts/:studentId', FinanceController.getStudentAccount);
router.post('/payments/initialize', FinanceController.initializePayment);
router.get('/structures', FinanceController.getStructures);

// 3. Authenticated Bursar & Treasury Endpoints
router.use(authenticate);

router.get('/overview', requirePermission(Permissions.FINANCE_OVERVIEW_VIEW), FinanceController.getOverview);
router.post('/structures', requirePermission(Permissions.FINANCE_PAYMENTS_RECORD), FinanceController.saveStructure);
router.post('/invoices/generate-batch', requirePermission(Permissions.FINANCE_PAYMENTS_RECORD), FinanceController.generateBatchInvoices);
router.post('/record-payment', requirePermission(Permissions.FINANCE_PAYMENTS_RECORD), FinanceController.recordPayment);
router.post('/transactions', requirePermission(Permissions.FINANCE_TRANSACTIONS_RECORD), FinanceController.recordTransaction);

export default router;
