import { OnlinePaymentsPanel } from '@/components/payments/OnlinePaymentsPanel';

export default function BursarOnlinePaymentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Online Payments</h1>
        <p className="text-xs text-slate-500 font-medium">Every payment made through Paystack, matched to its student and receipt. Nothing here needs typing in.</p>
      </div>
      <OnlinePaymentsPanel />
    </div>
  );
}
