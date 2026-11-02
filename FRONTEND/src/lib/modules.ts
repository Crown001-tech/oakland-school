/**
 * Optional modules a school can turn off in `schools.settings.modules`. A module that is off disappears
 * from every menu, its pages send the visitor home and its API answers 404. A module that is not
 * mentioned is on, so existing schools keep everything.
 */

export const MODULE_IDS = ['cbt', 'security', 'inventory', 'letters'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];
export type ModuleSettings = Partial<Record<ModuleId, boolean>>;

const PREFIXES: Record<ModuleId, string[]> = {
  cbt: ['/api/cbt', '/admin/cbt', '/teacher/cbt', '/student/cbt'],
  // The gate: the security portal and the parent's pickup PIN belong to it
  security: ['/api/security', '/api/pickup', '/security', '/parent/pickup'],
  inventory: ['/api/inventory', '/admin/inventory'],
  letters: ['/api/letters', '/admin/letters'],
};

/** Which module a path belongs to, or null when it belongs to the core system. */
export function moduleForPath(pathname: string | null | undefined): ModuleId | null {
  if (!pathname) return null;
  for (const id of MODULE_IDS) {
    if (PREFIXES[id].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return id;
  }
  return null;
}

export function isModuleEnabled(modules: ModuleSettings | null | undefined, id: ModuleId | null): boolean {
  if (!id) return true;
  return modules?.[id] !== false;
}

/** Reads the switches from school settings, ignoring anything that is not a plain true or false. */
export function readModuleSettings(settings: Record<string, unknown> | null | undefined): ModuleSettings {
  const raw = (settings?.modules && typeof settings.modules === 'object' ? settings.modules : {}) as Record<string, unknown>;
  const out: ModuleSettings = {};
  for (const id of MODULE_IDS) {
    if (typeof raw[id] === 'boolean') out[id] = raw[id] as boolean;
  }
  return out;
}
