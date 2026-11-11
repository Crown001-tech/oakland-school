/**
 * Which school an address belongs to, from its subdomain. This file has no imports from Next.js, so it can
 * be used in the middleware and in tests.
 *
 *   oakland.example.com   the school with the subdomain "oakland"
 *   localhost, 127.0.0.1  no school subdomain
 *   example.com           no school subdomain
 *   *.vercel.app          no school subdomain (hosting platform deployment address)
 *
 * Set APP_ROOT_DOMAIN to the product domain (example.com) so a school's address is read from the part before it.
 */
export function subdomainOf(host: string | null | undefined): string | null {
  if (!host) return null;
  const name = host.trim().toLowerCase().replace(/:\d+$/, '');
  if (name === 'localhost' || /^[0-9.]+$/.test(name) || name.startsWith('[')) return null;
  if (name.endsWith('.vercel.app')) return null;
  const labels = name.split('.');
  const root = (process.env.APP_ROOT_DOMAIN || '').toLowerCase();
  if (root) {
    if (!name.endsWith('.' + root)) return null;
    return name.slice(0, -(root.length + 1)).split('.')[0] || null;
  }
  return labels.length >= 3 ? labels[0] : null;
}

/** The subdomain to look up for an address: its own, or the deployment's default school when it has none. */
export function schoolSubdomainFor(host: string | null | undefined): string | null {
  return subdomainOf(host) || (process.env.DEFAULT_SCHOOL_SUBDOMAIN || '').trim().toLowerCase() || null;
}
