import { MessagesPanel } from '@/components/messaging/MessagesPanel';

export default function AdminMessagesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h1>
        <p className="text-xs text-slate-500">Everything sent to parents by WhatsApp, SMS and email, what it cost, and anything that failed.</p>
      </div>
      <MessagesPanel />
    </div>
  );
}
