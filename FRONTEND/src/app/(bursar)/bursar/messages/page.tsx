import { MessagesPanel } from '@/components/messaging/MessagesPanel';

export default function BursarMessagesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Messages</h1>
        <p className="text-xs text-slate-500 font-medium">Payment receipts and fee reminders sent to parents, and what they cost.</p>
      </div>
      <MessagesPanel />
    </div>
  );
}
