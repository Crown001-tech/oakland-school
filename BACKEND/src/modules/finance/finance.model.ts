import { prisma } from '../../config/prisma.js';

const DEFAULT_SCHOOL_ID = 'a0000000-0000-0000-0000-000000000001';

export class FinanceModel {
  static async getSummary(schoolId?: string) {
    const sId = schoolId || DEFAULT_SCHOOL_ID;

    // Fetch transactions from DB
    const transactions = await prisma.feeTransaction.findMany({
      where: { schoolId: sId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    // Fetch invoices to calculate collection rate and outstanding fees
    const invoices = await prisma.feeInvoice.findMany({
      where: { schoolId: sId },
      select: {
        totalAmount: true,
        paidAmount: true,
        balance: true,
      },
    });

    let totalBilled = 0;
    let totalCollected = 0;
    let outstandingFees = 0;

    for (const inv of invoices) {
      totalBilled += Number(inv.totalAmount);
      totalCollected += Number(inv.paidAmount);
      outstandingFees += Number(inv.balance);
    }

    // Sum transactions for total revenue
    let totalRevenue = 0;
    for (const tx of transactions) {
      if (tx.status === 'completed') {
        totalRevenue += Number(tx.amount);
      }
    }
    // If no transactions logged yet, use collected from invoices
    if (totalRevenue === 0 && totalCollected > 0) {
      totalRevenue = totalCollected;
    }

    const totalExpenses = 0;
    const netIncome = totalRevenue - totalExpenses;
    const feeCollectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netIncome,
      feeCollectionRate,
      outstandingFees,
      pettyCashBalance: 0,
      transactions: transactions.map(t => ({
        id: t.id,
        school_id: t.schoolId,
        receipt_number: t.receiptNumber,
        invoice_id: t.invoiceId,
        student_id: t.studentId,
        amount: Number(t.amount),
        payment_method: t.paymentMethod,
        reference: t.reference,
        receipt_pdf_url: t.receiptPdfUrl,
        payer_name: t.payerName,
        payer_email: t.payerEmail,
        payer_phone: t.payerPhone,
        status: t.status,
        recorded_by: t.recordedBy,
        date: t.createdAt.toISOString(),
        student: t.student
          ? {
              id: t.student.id,
              first_name: t.student.firstName,
              last_name: t.student.lastName,
              admission_number: t.student.admissionNumber,
            }
          : null,
      })),
    };
  }

  static async recordTransaction(data: {
    school_id: string;
    type?: 'income' | 'expense' | 'transfer';
    category?: string;
    amount: number;
    description?: string;
    reference?: string;
    recorded_by?: string;
    student_id?: string;
    invoice_id?: string;
    payer_name?: string;
    payment_method?: string;
  }) {
    const schoolId = data.school_id || DEFAULT_SCHOOL_ID;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    let studentId = data.student_id;
    if (!studentId) {
      const firstStudent = await prisma.student.findFirst({
        where: { schoolId },
        select: { id: true },
      });
      studentId = firstStudent?.id;
    }

    if (!studentId) {
      throw new Error('Cannot record transaction without an enrolled student.');
    }

    const created = await prisma.feeTransaction.create({
      data: {
        schoolId,
        studentId,
        invoiceId: data.invoice_id || undefined,
        receiptNumber,
        amount: data.amount,
        paymentMethod: data.payment_method || 'bank_transfer',
        reference: data.reference || null,
        payerName: data.payer_name || 'Guardian',
        status: 'completed',
        recordedBy: data.recorded_by || undefined,
      },
    });

    return {
      id: created.id,
      school_id: created.schoolId,
      receipt_number: created.receiptNumber,
      amount: Number(created.amount),
      payment_method: created.paymentMethod,
      reference: created.reference,
      date: created.createdAt.toISOString(),
      status: created.status,
    };
  }

  static async recordFeePayment(payment: {
    school_id: string;
    student_id: string;
    amount_paid: number;
    payment_method: string;
    received_by?: string;
    term_id?: string;
    notes?: string;
  }) {
    const schoolId = payment.school_id || DEFAULT_SCHOOL_ID;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Record fee transaction
    const tx = await prisma.feeTransaction.create({
      data: {
        schoolId,
        studentId: payment.student_id,
        receiptNumber,
        amount: payment.amount_paid,
        paymentMethod: payment.payment_method || 'bank_transfer',
        payerName: 'Guardian',
        status: 'completed',
        recordedBy: payment.received_by || undefined,
      },
    });

    // 2. Also record in fee_payments table
    await prisma.feePayment.create({
      data: {
        schoolId,
        receiptNumber,
        amountPaid: payment.amount_paid,
        paymentMethod: payment.payment_method,
        status: 'completed',
        notes: payment.notes || null,
        recordedBy: payment.received_by || undefined,
      },
    });

    return {
      id: tx.id,
      receipt_number: tx.receiptNumber,
      amount_paid: Number(tx.amount),
      payment_method: tx.paymentMethod,
      payment_date: tx.createdAt.toISOString(),
      status: tx.status,
    };
  }
}
