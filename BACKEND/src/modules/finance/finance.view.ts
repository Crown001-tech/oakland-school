export class FinanceView {
  static formatOverview(summary: any) {
    return {
      revenueFormatted: `₦${Number(summary.totalRevenue).toLocaleString()}`,
      expensesFormatted: `₦${Number(summary.totalExpenses).toLocaleString()}`,
      netIncomeFormatted: `₦${Number(summary.netIncome).toLocaleString()}`,
      outstandingFeesFormatted: `₦${Number(summary.outstandingFees).toLocaleString()}`,
      pettyCashBalanceFormatted: `₦${Number(summary.pettyCashBalance).toLocaleString()}`,
      collectionRate: `${summary.feeCollectionRate}%`,
      recentTransactions: summary.transactions,
    };
  }

  static formatReceipt(payment: any) {
    return {
      receiptNumber: payment.receipt_number || payment.receiptNumber,
      amount: payment.amount_paid || payment.amount,
      amountFormatted: `₦${Number(payment.amount_paid || payment.amount || 0).toLocaleString()}`,
      paymentDate: payment.payment_date || new Date().toISOString(),
      paymentMethod: payment.payment_method || 'Cash / Transfer',
      studentId: payment.student_id,
      notes: payment.notes,
    };
  }
}
