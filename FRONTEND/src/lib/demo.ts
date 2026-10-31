import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DEMO_SCHOOL_CODE, isDemoModeEnabled, type DemoRole } from '@/lib/demo-mode';

export type DemoAccounts = Partial<Record<DemoRole, string>>;

/**
 * The demo accounts, or null when this is not the demo database. Every school in the database
 * must carry the demo marker, so a DEMO_MODE flag set by mistake on a real school's deployment
 * finds Oakland's school code and gets nothing.
 *
 * Account identifiers (an email, or an admission number for the student) are stored by the demo
 * setup in schools.settings.demoAccounts. The password comes only from DEMO_ACCOUNT_PASSWORD.
 */
export async function getDemoAccounts(): Promise<DemoAccounts | null> {
  if (!isDemoModeEnabled()) return null;

  const { data: schools, error } = await getSupabaseAdmin().from('schools').select('code, settings');
  if (error || !schools || schools.length === 0) return null;
  if (schools.some((s: { code: string }) => s.code !== DEMO_SCHOOL_CODE)) return null;

  const accounts = schools[0].settings?.demoAccounts;
  return accounts && typeof accounts === 'object' ? (accounts as DemoAccounts) : {};
}
