import { ParentsPanel } from '@/components/messaging/ParentsPanel';

export default function ProprietorParentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Parent Accounts</h1>
        <p className="text-xs text-slate-500 font-medium">Send each parent a link on their phone to set up their own account and password.</p>
      </div>
      <ParentsPanel />
    </div>
  );
}
