import type { PGlite } from '@electric-sql/pglite';

// A Supabase-style client over the in-process Postgres built from the real migrations, so route and engine
// code can run against the real tables, constraints, functions and ledger. It supports what the code under
// test uses: select with filters, order and limit; insert; update; upsert; delete; maybeSingle; rpc by name
// with named arguments. Embedded selects are not supported.

type Filter = { sql: (n: number) => string; values: unknown[] };

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const val = (v: unknown) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v);

export function pgSupabase(db: PGlite) {
  function table(name: string) {
    const filters: Filter[] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    let payload: any;
    let cols = '*';
    let orderBy: string[] = [];
    let max: number | undefined;
    let countOnly = false;
    let upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
    let returning = false;

    const where = (start: number) => {
      const parts: string[] = [];
      const values: unknown[] = [];
      for (const f of filters) {
        parts.push(f.sql(start + values.length));
        values.push(...f.values);
      }
      return { text: parts.length ? ` WHERE ${parts.join(' AND ')}` : '', values };
    };

    const run = async (): Promise<{ data: any; error: any; count?: number }> => {
      try {
        const t = `public.${ident(name)}`;
        if (op === 'select') {
          const w = where(1);
          const sel = countOnly ? 'COUNT(*)::int AS n' : cols.replace(/,?\s*\w+\s*\([^)]*\)/g, '').replace(/^\s*,/, '').trim() || '*';
          const inner = `SELECT ${sel} FROM ${t}${w.text}${orderBy.length ? ` ORDER BY ${orderBy.join(', ')}` : ''}${max != null ? ` LIMIT ${max}` : ''}`;
          // Rows come back as JSON, as they do from the real service: dates and times as text
          const { rows: raw } = await db.query<any>(countOnly ? inner : `SELECT row_to_json(q) AS j FROM (${inner}) q`, w.values as any[]);
          const rows = countOnly ? raw : raw.map((r: any) => r.j);
          if (countOnly) return { data: null, error: null, count: rows[0].n };
          // Embedded lookups by the usual naming: `guardians ( id, first_name )` joins on this table's guardian_id
          for (const m of cols.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
            const [, rel, inner] = m;
            const fk = `${rel.replace(/s$/, '')}_id`;
            for (const row of rows) {
              if (row[fk] === undefined) continue;
              const innerCols = inner.split(',').map((c) => ident(c.trim())).join(', ');
              const found = await db.query<any>(`SELECT ${innerCols} FROM public.${ident(rel)} WHERE id = $1`, [row[fk]]);
              row[rel] = found.rows[0] ?? null;
            }
          }
          return { data: rows, error: null };
        }
        if (op === 'insert' || op === 'upsert') {
          const list: any[] = Array.isArray(payload) ? payload : [payload];
          const out: any[] = [];
          for (const row of list) {
            const keys = Object.keys(row);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            let sql = `INSERT INTO ${t} (${keys.map(ident).join(', ')}) VALUES (${placeholders})`;
            if (op === 'upsert') {
              const conflict = (upsertOpts.onConflict ?? 'id').split(',').map((c) => ident(c.trim())).join(', ');
              sql += upsertOpts.ignoreDuplicates
                ? ` ON CONFLICT (${conflict}) DO NOTHING`
                : ` ON CONFLICT (${conflict}) DO UPDATE SET ${keys.map((k) => `${ident(k)} = EXCLUDED.${ident(k)}`).join(', ')}`;
            }
            const { rows } = await db.query<any>(`WITH r AS (${sql} RETURNING *) SELECT row_to_json(r) AS j FROM r`, keys.map((k) => val(row[k])) as any[]);
            out.push(...rows.map((x: any) => x.j));
          }
          return { data: out, error: null };
        }
        if (op === 'update') {
          const keys = Object.keys(payload);
          const w = where(keys.length + 1);
          const sql = `WITH r AS (UPDATE ${t} SET ${keys.map((k, i) => `${ident(k)} = $${i + 1}`).join(', ')}${w.text} RETURNING *) SELECT row_to_json(r) AS j FROM r`;
          const { rows } = await db.query<any>(sql, [...keys.map((k) => val(payload[k])), ...w.values] as any[]);
          return { data: rows.map((x: any) => x.j), error: null };
        }
        const w = where(1);
        const { rows } = await db.query<any>(`WITH r AS (DELETE FROM ${t}${w.text} RETURNING *) SELECT row_to_json(r) AS j FROM r`, w.values as any[]);
        return { data: rows.map((x: any) => x.j), error: null };
      } catch (e: any) {
        return { data: null, error: { code: e?.code, message: e?.message ?? String(e) } };
      }
    };

    const add = (col: string, op2: string, v: unknown) => filters.push({ sql: (n) => `${ident(col)} ${op2} $${n}`, values: [v] });
    const b: any = {
      select: (c?: string, o?: { count?: string; head?: boolean }) => {
        if (op === 'select') cols = c ?? '*';
        else returning = true;
        if (o?.head) countOnly = true;
        return b;
      },
      eq: (c: string, v: unknown) => (add(c, '=', v), b),
      neq: (c: string, v: unknown) => (add(c, '<>', v), b),
      lte: (c: string, v: unknown) => (add(c, '<=', v), b),
      gte: (c: string, v: unknown) => (add(c, '>=', v), b),
      lt: (c: string, v: unknown) => (add(c, '<', v), b),
      gt: (c: string, v: unknown) => (add(c, '>', v), b),
      ilike: (c: string, v: string) => (add(c, 'ILIKE', v), b),
      in: (c: string, vs: unknown[]) => (filters.push({ sql: (n) => `${ident(c)} = ANY($${n})`, values: [vs] }), b),
      is: (c: string, v: unknown) => (filters.push({ sql: () => (v === null ? `${ident(c)} IS NULL` : `${ident(c)} IS ${v ? 'TRUE' : 'FALSE'}`), values: [] }), b),
      order: (c: string, o?: { ascending?: boolean }) => (orderBy.push(`${ident(c)} ${o?.ascending === false ? 'DESC' : 'ASC'}`), b),
      limit: (n: number) => ((max = n), b),
      insert: (p: any) => ((op = 'insert'), (payload = p), b),
      upsert: (p: any, o?: any) => ((op = 'upsert'), (payload = p), (upsertOpts = o ?? {}), b),
      update: (p: any) => ((op = 'update'), (payload = p), b),
      delete: () => ((op = 'delete'), b),
      maybeSingle: async () => {
        const r = await run();
        return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error };
      },
      single: async () => {
        const r = await run();
        const first = Array.isArray(r.data) ? r.data[0] ?? null : r.data;
        return { data: first, error: first ? r.error : r.error ?? { message: 'not found' } };
      },
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => run().then(res, rej),
    };
    void returning;
    return b;
  }

  async function rpc(name: string, args: Record<string, unknown> = {}) {
    try {
      const keys = Object.keys(args);
      const sql = `SELECT public.${ident(name)}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) AS result`;
      const { rows } = await db.query<{ result: any }>(sql, keys.map((k) => val(args[k])) as any[]);
      return { data: rows[0]?.result ?? null, error: null };
    } catch (e: any) {
      return { data: null, error: { code: e?.code, message: e?.message ?? String(e) } };
    }
  }

  return { from: table, rpc };
}
