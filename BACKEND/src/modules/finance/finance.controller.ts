import { Request, Response } from 'express';
import { FinanceModel } from './finance.model.js';
import { FinanceView } from './finance.view.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { feeManagementService } from './fee-management.service.js';
import { paymentGatewayService } from './payment-gateway.service.js';
import { prisma } from '../../config/prisma.js';

export class FinanceController {
  /**
   * GET /api/v1/finance/overview
   */
  static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const summary = await feeManagementService.getBursarLedgerSummary();
      ResponseUtil.success(res, summary, 'Bursar ledger overview retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch finance overview', err);
    }
  }

  /**
   * GET /api/v1/finance/structures
   */
  static async getStructures(_req: Request, res: Response): Promise<void> {
    try {
      const structures = await feeManagementService.getFeeStructures();
      ResponseUtil.success(res, structures, 'Fee structures retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch fee structures', err);
    }
  }

  /**
   * POST /api/v1/finance/structures
   */
  static async saveStructure(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const structure = await feeManagementService.saveFeeStructure(req.body);
      ResponseUtil.success(res, structure, 'Fee structure saved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to save fee structure', err);
    }
  }

  /**
   * GET /api/v1/finance/accounts/:studentId
   */
  static async getStudentAccount(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const accountData = await feeManagementService.getStudentAccount(studentId);
      ResponseUtil.success(res, accountData, 'Student financial account retrieved');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch student financial account', err);
    }
  }

  /**
   * POST /api/v1/finance/invoices/generate-batch
   */
  static async generateBatchInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { className, term, academicYear, students } = req.body;
      if (!className || !term) {
        ResponseUtil.badRequest(res, 'className and term are required');
        return;
      }

      let resolvedStudents = students;
      if (!resolvedStudents || resolvedStudents.length === 0) {
        const dbClass = await prisma.class.findFirst({
          where: { name: className },
          include: {
            enrollments: {
              where: { status: 'active' },
              include: { student: true },
            },
          },
        });
        resolvedStudents = (dbClass?.enrollments || []).map((e: any) => ({
          id: e.student.id,
          name: `${e.student.firstName} ${e.student.lastName}`.trim(),
        }));
      }

      const result = await feeManagementService.generateInvoicesForClass({
        className,
        term,
        academicYear,
        students: resolvedStudents,
      });

      ResponseUtil.success(res, result, `Generated ${result.generatedCount} invoices for ${className}`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to generate batch invoices', err);
    }
  }

  /**
   * POST /api/v1/finance/record-payment
   */
  static async recordPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { studentId, studentName, studentClass, amount, paymentMethod, invoiceId, reference, payerName, payerEmail } = req.body;
      if (!studentId || !amount) {
        ResponseUtil.badRequest(res, 'studentId and amount are required');
        return;
      }

      const result = await feeManagementService.recordPayment({
        studentId,
        studentName,
        studentClass,
        amount: Number(amount),
        paymentMethod: paymentMethod || 'Bank Transfer',
        invoiceId,
        reference,
        payerName,
        payerEmail,
        recordedBy: req.user?.id ? `Staff (${req.user.role})` : 'Bursar Entry',
      });

      ResponseUtil.created(res, result, 'Fee payment successfully recorded and reconciled');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to record fee payment', err);
    }
  }

  /**
   * POST /api/v1/finance/payments/initialize
   */
  static async initializePayment(req: Request, res: Response): Promise<void> {
    try {
      const { studentId, invoiceId, amount, payerEmail, payerName, payerPhone } = req.body;
      if (!studentId || !amount || !payerEmail) {
        ResponseUtil.badRequest(res, 'studentId, amount, and payerEmail are required');
        return;
      }

      const result = await paymentGatewayService.initializePayment({
        studentId,
        invoiceId,
        amount: Number(amount),
        payerEmail,
        payerName: payerName || 'Parent',
        payerPhone,
      });

      ResponseUtil.success(res, result, 'Payment checkout session initialized');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to initialize payment', err);
    }
  }

  /**
   * POST /api/v1/finance/payments/webhook
   * Public endpoint for Paystack / Flutterwave webhook notifications.
   */
  static async handlePaymentWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body.event || 'charge.success';
      const data = req.body.data || req.body;

      const result = await paymentGatewayService.processWebhook(event, data);
      res.status(200).json({ status: 'success', ...result });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  /**
   * POST /api/v1/finance/transactions
   */
  static async recordTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, category, amount, description, reference } = req.body;
      if (!type || !amount || !description) {
        ResponseUtil.badRequest(res, 'type, amount, and description are required');
        return;
      }

      const schoolId = req.user?.school_id || 'school-main';
      const userId = req.user?.id || 'system';

      const tx = await FinanceModel.recordTransaction({
        school_id: schoolId,
        type,
        category: category || 'General',
        amount: Number(amount),
        description,
        reference,
        recorded_by: userId,
      });

      ResponseUtil.created(res, tx, 'Transaction recorded successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to record transaction', err);
    }
  }
}
