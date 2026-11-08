import { ParentsPanel } from '@/components/messaging/ParentsPanel';

export default function AdminParentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invite Parents</h1>
        <p className="text-xs text-slate-500">Send parents a link so they can sign in to see fees and results.</p>
      </div>
      <ParentsPanel />
    </div>
  );
}
