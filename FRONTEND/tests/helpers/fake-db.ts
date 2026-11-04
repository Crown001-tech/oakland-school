// A small in-memory stand-in for the database client, shared by tests. It applies filters, inserts, updates,
// upserts (with ignoreDuplicates), deletes, ordering, limits and the one kind of embed the messaging tests
// need. It is deliberately simple: it exists so route and engine logic can be tested without a database.

export type Row = Record<string, any>;

export interface FakeOptions {
  /** table -> unique key columns, so upsert and duplicate checks behave like the real constraints */
  unique?: Record<string, string[]>;
  /** table -> embed name -> { table, column on this table, column on the other } */
  embeds?: Record<string, Record<string, { table: string; from: string; to: string }>>;
}

export function createFakeDb(tables: Record<string, Row[]>, opts: FakeOptions = {}) {
  let seq = 0;
  const rows = (t: string) => (tables[t] ??= []);

  function table(name: string) {
    const state: { op: 'select' | 'insert' | 'update' | 'delete' | 'upsert'; filters: ((r: Row) => boolean)[]; payload?: any; ignore?: boolean; onConflict?: string; order?: { col: string; asc: boolean }[]; max?: number; embed?: string; head?: boolean; count?: boolean } = {
      op: 'select',
      filters: [],
    };
    const matching = () => {
      let hits = rows(name).filter((r) => state.filters.every((f) => f(r)));
      for (const o of [...(state.order ?? [])].reverse()) hits = [...hits].sort((a, b) => (a[o.col] > b[o.col] ? 1 : a[o.col] < b[o.col] ? -1 : 0) * (o.asc ? 1 : -1));
      return state.max != null ? hits.slice(0, state.max) : hits;
    };
    const withEmbeds = (r: Row) => {
      const out = { ...r };
      for (const [embedName, rel] of Object.entries(opts.embeds?.[name] ?? {})) {
        if (state.embed?.includes(embedName)) out[embedName] = rows(rel.table).find((o) => o[rel.to] === r[rel.from]) ?? null;
      }
      return out;
    };
    const keys = () => (state.onConflict ? state.onConflict.split(',') : opts.unique?.[name] ?? ['id']);
    const exists = (incoming: Row) => rows(name).find((r) => keys().every((k) => r[k] === incoming[k]));

    const run = () => {
      if (state.op === 'insert' || state.op === 'upsert') {
        const list: Row[] = Array.isArray(state.payload) ? state.payload : [state.payload];
        const written: Row[] = [];
        for (const incoming of list) {
          const hit = exists(incoming);
          if (hit) {
            if (state.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            if (!state.ignore) {
              Object.assign(hit, incoming);
              written.push(hit);
            }
            continue;
          }
          const row = { id: incoming.id ?? `${name}-${++seq}`, ...incoming };
          rows(name).push(row);
          written.push(row);
        }
        return { data: written, error: null };
      }
      if (state.op === 'update') {
        const hits = matching();
        hits.forEach((r) => Object.assign(r, state.payload));
        return { data: hits, error: null };
      }
      if (state.op === 'delete') {
        const gone = new Set(matching());
        tables[name] = rows(name).filter((r) => !gone.has(r));
        return { data: [...gone], error: null };
      }
      const hits = matching().map(withEmbeds);
      return { data: state.head ? null : hits, error: null, count: state.count ? hits.length : null };
    };

    const b: any = {
      select: (cols?: string, o?: { count?: string; head?: boolean }) => {
        if (state.op === 'select') state.embed = cols ?? '';
        state.head = o?.head;
        state.count = Boolean(o?.count);
        return b;
      },
      eq: (c: string, v: unknown) => (state.filters.push((r) => r[c] === v), b),
      neq: (c: string, v: unknown) => (state.filters.push((r) => r[c] !== v), b),
      in: (c: string, vs: unknown[]) => (state.filters.push((r) => vs.includes(r[c])), b),
      lte: (c: string, v: any) => (state.filters.push((r) => r[c] <= v), b),
      gte: (c: string, v: any) => (state.filters.push((r) => r[c] >= v), b),
      lt: (c: string, v: any) => (state.filters.push((r) => r[c] < v), b),
      gt: (c: string, v: any) => (state.filters.push((r) => r[c] > v), b),
      is: (c: string, v: unknown) => (state.filters.push((r) => (v === null ? r[c] == null : r[c] === v)), b),
      not: (c: string, op: string, v: unknown) => (state.filters.push((r) => (op === 'is' && v === null ? r[c] != null : r[c] !== v)), b),
      order: (c: string, o?: { ascending?: boolean }) => ((state.order ??= []).push({ col: c, asc: o?.ascending !== false }), b),
      limit: (n: number) => ((state.max = n), b),
      insert: (p: any) => ((state.op = 'insert'), (state.payload = p), b),
      upsert: (p: any, o?: { onConflict?: string; ignoreDuplicates?: boolean }) => ((state.op = 'upsert'), (state.payload = p), (state.onConflict = o?.onConflict), (state.ignore = o?.ignoreDuplicates), b),
      update: (p: any) => ((state.op = 'update'), (state.payload = p), b),
      delete: () => ((state.op = 'delete'), b),
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error };
      },
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
        return { data: first, error: first ? r.error : { message: 'not found' } };
      },
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }

  return { from: table, tables };
}
