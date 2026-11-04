import { MessagingSettingsPanel } from '@/components/messaging/MessagingSettingsPanel';

export default function ProprietorMessagingSetupPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">Messaging Setup</h1>
        <p className="text-xs text-slate-500 font-medium">How the school’s messages are sent to parents, and when fee reminders go out.</p>
      </div>
      <MessagingSettingsPanel />
    </div>
  );
}
