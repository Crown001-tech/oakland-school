import { notFound } from 'next/navigation';
import { DemoStage } from '@/components/demo/DemoStage';
import { Logo } from '@/components/brand/Logo';
import { isDemoModeEnabled } from '@/lib/demo-mode';

export default function DemoPage() {
  if (!isDemoModeEnabled()) notFound();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex items-center justify-between gap-4">
        <Logo size="md" href={null} />
        <p className="hidden text-sm text-slate-600 sm:block">Sample records only. Anything you add is cleared each night.</p>
      </header>
      <DemoStage />
    </main>
  );
}
