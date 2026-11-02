'use client';

import { useEffect, useState } from 'react';
import type { ModuleSettings } from '@/lib/modules';

/** The school's module switches, for menus. Every module counts as on until the answer arrives. */
let pending: Promise<ModuleSettings> | null = null;

function loadModules(): Promise<ModuleSettings> {
  if (!pending) {
    pending = fetch('/api/schools/modules')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json?.success && json.data ? (json.data as ModuleSettings) : {}))
      .catch(() => ({}));
  }
  return pending;
}

export function useModules(): ModuleSettings {
  const [modules, setModules] = useState<ModuleSettings>({});
  useEffect(() => {
    let mounted = true;
    loadModules().then((m) => mounted && setModules(m));
    return () => {
      mounted = false;
    };
  }, []);
  return modules;
}
