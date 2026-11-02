'use client';

import { useEffect, useState } from 'react';

/**
 * The school's registered subject names, from its `subjects` table, sorted and without duplicates.
 * Empty until loaded, and empty for a school that has not set up subjects yet (nothing is invented).
 */
let pending: Promise<string[]> | null = null;

export function loadSubjectNames(): Promise<string[]> {
  if (!pending) {
    pending = fetch('/api/subjects')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.success || !Array.isArray(json.data)) return [];
        const names = (json.data as { name?: string }[]).map((s) => (s.name || '').trim()).filter(Boolean);
        return Array.from(new Set(names)).sort();
      })
      .catch(() => []);
  }
  return pending;
}

export function useSubjectNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let mounted = true;
    loadSubjectNames().then((n) => mounted && setNames(n));
    return () => {
      mounted = false;
    };
  }, []);
  return names;
}
