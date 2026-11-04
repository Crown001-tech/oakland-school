import { AdjustmentsPanel } from '@/components/payments/AdjustmentsPanel';

export default function BursarAdjustmentsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Discounts and Plans</h1>
        <p className="text-xs text-slate-500 font-medium">Scholarships, discounts, sibling discounts and instalment plans. Each one is kept with who gave it and why.</p>
      </div>
      <AdjustmentsPanel />
    </div>
  );
}
