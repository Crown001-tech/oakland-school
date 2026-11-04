import { ParentsPanel } from '@/components/messaging/ParentsPanel';

export default function AdminParentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Parent Accounts</h1>
        <p className="text-xs text-slate-500">Send each parent a link on their phone to set up their own account and password.</p>
      </div>
      <ParentsPanel />
    </div>
  );
}
