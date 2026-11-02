import { schoolSubdomainFor, subdomainOf } from '@/lib/school-host';
import { readModuleSettings, type ModuleSettings } from '@/lib/modules';

/**
 * The middleware runs before every request and needs to know which optional modules the school at the
 * address has switched off. It reads that straight from the database, with one request to Supabase, instead
 * of calling the app's own API. The answer is remembered for a minute per address, so one school's switches
 * are never used for another.
 *
 * If the switches cannot be read, modules stay on rather than lock a school out.
 */

const CACHE_MS = 60_000;
const cache = new Map<string, { value: ModuleSettings; at: number }>();

export async function getModuleSwitchesForHost(host: string | null | undefined): Promise<ModuleSettings> {
  const key = (host || '').toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return {};

  try {
    const sub = schoolSubdomainFor(host);
    // With a subdomain, that school. Without one, the only school there is: two or more means no school is chosen.
    const query = sub ? `subdomain=ilike.${encodeURIComponent(sub)}&select=settings&limit=1` : 'select=settings&limit=2';
    const res = await fetch(`${url}/rest/v1/schools?${query}`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (!res.ok) return {};
    const rows = (await res.json()) as { settings: Record<string, unknown> | null }[];
    const school = sub || subdomainOf(host) ? rows[0] : rows.length === 1 ? rows[0] : undefined;
    const value = school ? readModuleSettings(school.settings) : {};
    cache.set(key, { value, at: Date.now() });
    return value;
  } catch {
    return {};
  }
}
