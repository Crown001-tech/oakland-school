import { OnlinePaymentsPanel } from '@/components/payments/OnlinePaymentsPanel';
import { PaymentSetupPanel } from '@/components/payments/PaymentSetupPanel';

export default function ProprietorOnlinePaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Online Payments</h1>
        <p className="text-xs text-slate-500 font-medium">Parents pay fees straight into the school’s own bank account. Eductive never holds the money.</p>
      </div>
      <PaymentSetupPanel />
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Payments</h2>
        <OnlinePaymentsPanel />
      </div>
    </div>
  );
}
