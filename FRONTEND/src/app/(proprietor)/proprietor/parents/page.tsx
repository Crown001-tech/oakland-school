import { ParentsPanel } from '@/components/messaging/ParentsPanel';

export default function ProprietorParentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Invite Parents</h1>
        <p className="text-xs text-slate-500 font-medium">Send parents a link so they can sign in to see fees and results.</p>
      </div>
      <ParentsPanel />
    </div>
  );
}
