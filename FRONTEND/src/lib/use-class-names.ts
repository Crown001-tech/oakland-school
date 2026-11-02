'use client';

import { useEffect, useState } from 'react';

/**
 * The school's class names in teaching order, from the database. Empty until loaded, and empty for a
 * school that has not set up classes yet (nothing is invented).
 */
let pending: Promise<string[]> | null = null;

export function loadClassNames(): Promise<string[]> {
  if (!pending) {
    pending = fetch('/api/schools/classes')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => (json?.success && Array.isArray(json.data) ? (json.data as string[]) : []))
      .catch(() => []);
  }
  return pending;
}

export function useClassNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let mounted = true;
    loadClassNames().then((n) => mounted && setNames(n));
    return () => {
      mounted = false;
    };
  }, []);
  return names;
}
