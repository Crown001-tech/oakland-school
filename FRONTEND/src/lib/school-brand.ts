import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { findSchoolIdForHost } from '@/lib/school-db';
import { subdomainOf } from '@/lib/school-host';

/**
 * What a visitor sees of the school whose address they came in on: its details, brand colours, and whether it
 * has the long public pages (about, academics, values) written for it. All schools share one deployment, so
 * this is read per address. An address that matches no school gets nothing.
 *
 * settings.publicSite is 'full' for a school that has its own copy. Any other school gets a short page of its
 * own details, never another school's text.
 */

export interface HostSchool {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  publicSite: 'full' | 'minimal';
  primary?: string;
  accent?: string;
}

const DEFAULT_OAKLAND_SCHOOL: HostSchool = {
  name: 'Oakland Schools, Lagos',
  motto: 'Excellence, Integrity, Leadership',
  address: '14 Academic Crescent, Victoria Island, Lagos',
  phone: '+234 800 625 5263',
  email: 'admin@oaklandschools.edu',
  publicSite: 'full',
  primary: '#07181a',
  accent: '#d4a85a',
};

const cache = new Map<string, { value: HostSchool | null; expires: number }>();

async function loadHostSchool(): Promise<HostSchool | null> {
  let host = '';
  try {
    const h = await headers();
    host = h.get('x-forwarded-host') || h.get('host') || '';
    const hit = cache.get(host);
    if (hit && hit.expires > Date.now()) return hit.value;

    let value: HostSchool | null = null;
    try {
      const admin = getSupabaseAdmin();
      const schoolId = await findSchoolIdForHost(admin, host);
      if (schoolId) {
        const { data } = await admin.from('schools').select('name, motto, address, phone, email, settings').eq('id', schoolId).maybeSingle();
        if (data) {
          const s = (data.settings ?? {}) as Record<string, unknown>;
          value = {
            name: data.name || '',
            motto: data.motto || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            publicSite: s.publicSite === 'full' ? 'full' : 'minimal',
            primary: typeof s.brandPrimary === 'string' ? s.brandPrimary : undefined,
            accent: typeof s.brandAccent === 'string' ? s.brandAccent : undefined,
          };
        }
      }
    } catch (dbErr) {
      console.warn('loadHostSchool Supabase query error:', dbErr);
    }

    if (!value && !subdomainOf(host)) {
      value = DEFAULT_OAKLAND_SCHOOL;
    }

    cache.set(host, { value, expires: Date.now() + 60_000 });
    return value;
  } catch {
    return !subdomainOf(host) ? DEFAULT_OAKLAND_SCHOOL : null;
  }
}

/** The brand colours of the school at this address, for the page theme. */
export async function getHostSchoolBrand(): Promise<{ primary?: string; accent?: string }> {
  const school = await loadHostSchool();
  return { primary: school?.primary, accent: school?.accent };
}

/** The school at this address, for the public pages. */
export async function getHostSchoolPublic(): Promise<HostSchool | null> {
  return loadHostSchool();
}
