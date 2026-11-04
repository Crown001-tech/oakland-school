import { MessagesPanel } from '@/components/messaging/MessagesPanel';

export default function ProprietorMessagesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Messages</h1>
        <p className="text-xs text-slate-500 font-medium">Everything sent to parents by WhatsApp, SMS and email, what it cost, and anything that failed.</p>
      </div>
      <MessagesPanel />
    </div>
  );
}
