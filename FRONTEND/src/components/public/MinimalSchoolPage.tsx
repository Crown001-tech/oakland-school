import Link from 'next/link';
import type { HostSchool } from '@/lib/school-brand';

/**
 * The public page of a school that has no long pages of its own: its name, motto and contact details, and the
 * two things a visitor comes to do. Only what the school has filled in is shown. Nothing is written for it.
 */
export function MinimalSchoolPage({ school }: { school: HostSchool | null }) {
  if (!school) {
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">This address is not set up for a school</h1>
        <p className="mt-3 text-sm text-slate-600">Check the address you were given, or contact the school.</p>
      </section>
    );
  }

  const details = [
    { label: 'Address', value: school.address },
    { label: 'Phone', value: school.phone },
    { label: 'Email', value: school.email },
  ].filter((d) => d.value);

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{school.name}</h1>
      {school.motto && <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">{school.motto}</p>}

      {details.length > 0 && (
        <dl className="mx-auto mt-10 max-w-md space-y-3 text-left text-sm">
          {details.map((d) => (
            <div key={d.label} className="flex gap-4 border-b border-slate-200 pb-3">
              <dt className="w-20 shrink-0 font-semibold text-slate-500">{d.label}</dt>
              <dd className="text-slate-900">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href="/admissions" className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-primary px-6 text-sm font-semibold text-white">
          Apply for Admission
        </Link>
        <Link href="/login" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-6 text-sm font-semibold text-slate-800">
          Sign In
        </Link>
      </div>
    </section>
  );
}
