import { describe, expect, it } from 'vitest';
import { scopeClient } from '@/lib/school-scope';
import { subdomainOf } from '@/lib/school-db';

// A stand-in for the database client that records what a route asks of it.
function fakeAdmin() {
  const log: { table: string; call: string; args: any[]; filters: [string, unknown][] }[] = [];
  const admin: any = {
    rpc: (...args: any[]) => log.push({ table: '', call: 'rpc', args, filters: [] }),
    auth: {},
    storage: {},
    from: (table: string) => {
      const chain = (call: string, args: any[]) => {
        const entry = { table, call, args, filters: [] as [string, unknown][] };
        log.push(entry);
        const builder: any = { eq: (col: string, val: unknown) => (entry.filters.push([col, val]), builder), select: () => builder };
        return builder;
      };
      return {
        select: (...a: any[]) => chain('select', a),
        update: (...a: any[]) => chain('update', a),
        delete: (...a: any[]) => chain('delete', a),
        insert: (...a: any[]) => chain('insert', a),
        upsert: (...a: any[]) => chain('upsert', a),
      };
    },
  };
  return { admin, log };
}

const A = 'school-a';

describe('The school client', () => {
  it('limits every read, update and delete to its own school', () => {
    const { admin, log } = fakeAdmin();
    const db = scopeClient(admin, A);
    db.from('students').select('*');
    db.from('visitors').update({ status: 'out' });
    db.from('documents').delete();
    expect(log.map((l) => l.filters)).toEqual([[['school_id', A]], [['school_id', A]], [['school_id', A]]]);
  });

  it('keeps a route\'s own filters and still adds the school', () => {
    const { admin, log } = fakeAdmin();
    scopeClient(admin, A).from('students').select('id').eq('status', 'active');
    expect(log[0].filters).toEqual([['school_id', A], ['status', 'active']]);
  });

  it('stamps its school on every inserted row, replacing a school id that was sent in', () => {
    const { admin, log } = fakeAdmin();
    const db = scopeClient(admin, A);
    db.from('classes').insert({ name: 'JSS 1', school_id: 'school-b' });
    db.from('classes').insert([{ name: 'JSS 2' }, { name: 'JSS 3', school_id: 'school-b' }]);
    db.from('classes').upsert({ name: 'SS 1', school_id: 'school-b' });
    expect(log[0].args[0]).toEqual({ name: 'JSS 1', school_id: A });
    expect(log[1].args[0]).toEqual([{ name: 'JSS 2', school_id: A }, { name: 'JSS 3', school_id: A }]);
    expect(log[2].args[0]).toEqual({ name: 'SS 1', school_id: A });
  });

  it('reaches only its own row of the schools table, and cannot create or delete a school', () => {
    const { admin, log } = fakeAdmin();
    const db = scopeClient(admin, A);
    db.from('schools').select('settings');
    db.from('schools').update({ name: 'New name' });
    expect(log.map((l) => l.filters)).toEqual([[['id', A]], [['id', A]]]);
    expect(() => db.from('schools').insert({ name: 'Another school' })).toThrow();
    expect(() => db.from('schools').delete()).toThrow();
  });

  it('leaves the tables that hold no school data alone', () => {
    const { admin, log } = fakeAdmin();
    scopeClient(admin, A).from('role_permissions').select('*');
    expect(log[0].filters).toEqual([]);
  });

  it('gives two schools two separate views of the same table', () => {
    const { admin, log } = fakeAdmin();
    scopeClient(admin, 'school-a').from('students').select('*');
    scopeClient(admin, 'school-b').from('students').select('*');
    expect(log.map((l) => l.filters[0][1])).toEqual(['school-a', 'school-b']);
  });
});

describe('Which school an address belongs to', () => {
  it('reads the school from the subdomain', () => {
    expect(subdomainOf('oakland.example.com')).toBe('oakland');
    expect(subdomainOf('Oakland.Example.com:3000')).toBe('oakland');
  });

  it('has no school subdomain on localhost, an IP address, a bare domain or vercel.app', () => {
    expect(subdomainOf('localhost:3000')).toBeNull();
    expect(subdomainOf('127.0.0.1:3000')).toBeNull();
    expect(subdomainOf('example.com')).toBeNull();
    expect(subdomainOf('oakland-school.vercel.app')).toBeNull();
    expect(subdomainOf(null)).toBeNull();
  });
});

import { idPrefixFor, studentEmailDomainFor, studentAuthEmail } from '@/lib/school-config';

describe('What a school sets for itself', () => {
  it('starts generated numbers with the school\'s own letters', () => {
    expect(idPrefixFor({ code: 'OAK-001' })).toBe('OAK');
    expect(idPrefixFor({ code: 'GFC-001' })).toBe('GFC');
    expect(idPrefixFor({ code: 'GFC-001', settings: { idPrefix: 'gra' } })).toBe('GRA');
    expect(idPrefixFor({ code: '', settings: {} })).toBe('SCH');
    expect(idPrefixFor({ code: 'X-1', settings: { idPrefix: '!!' } })).toBe('SCH');
  });

  it('gives every school its own student sign-in domain', () => {
    expect(studentEmailDomainFor({ subdomain: 'greenfield' })).toBe('student.greenfield.invalid');
    expect(studentEmailDomainFor({ subdomain: 'alpha' })).not.toBe(studentEmailDomainFor({ subdomain: 'beta' }));
  });

  it('keeps the domain a school already uses for its students', () => {
    expect(studentEmailDomainFor({ subdomain: null, settings: { studentEmailDomain: 'Student.Oakland.ng' } })).toBe('student.oakland.ng');
    expect(studentAuthEmail('ADM-001', 'student.oakland.ng')).toBe('adm-001@student.oakland.ng');
  });

  it('gives two schools with the same admission number two different sign-in addresses', () => {
    const a = studentAuthEmail('001', studentEmailDomainFor({ subdomain: 'alpha' }));
    const b = studentAuthEmail('001', studentEmailDomainFor({ subdomain: 'beta' }));
    expect(a).not.toBe(b);
  });
});
