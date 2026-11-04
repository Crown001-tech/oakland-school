import { enqueueForGuardians, enqueueMessage, guardiansOf, type Channel } from '@/lib/messaging/outbox';

/**
 * What the school says when something happens: a payment arrives, a child is marked absent or late, a child is
 * released at the gate, results are released, the school sends a notice. Each one queues messages (it does not
 * send them) and is safe to call from anywhere: a problem with messaging is logged and swallowed, so it can
 * never stop a payment being recorded or a child being released.
 */

type Db = { from: (table: string) => any; schoolId: string };

const TZ = 'Africa/Lagos';
export const lagosDate = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
export const lagosTime = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s+/g, ' ');

async function schoolName(db: Db): Promise<string> {
  const { data } = await db.from('schools').select('name').maybeSingle();
  return String(data?.name ?? '').trim();
}

async function studentName(db: Db, studentId: string): Promise<string> {
  const { data } = await db.from('students').select('first_name, last_name').eq('id', studentId).maybeSingle();
  return `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim();
}

async function safely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`Message for ${label} was not queued:`, err instanceof Error ? err.message : err);
  }
}

export function notifyPaymentReceived(db: Db, p: { studentId: string; amount: number; receipt: string; balance: number }) {
  return safely('payment', async () => {
    const [school, student] = await Promise.all([schoolName(db), studentName(db, p.studentId)]);
    await enqueueForGuardians(db, p.studentId, 'payment_received', `payment:${p.receipt}`, { school, student, amount: p.amount, receipt: p.receipt, balance: p.balance });
  });
}

export function notifyAttendance(db: Db, p: { studentId: string; status: 'absent' | 'late'; isoDate: string }) {
  return safely('attendance', async () => {
    const [school, student] = await Promise.all([schoolName(db), studentName(db, p.studentId)]);
    const date = lagosDate(new Date(`${p.isoDate}T12:00:00Z`));
    await enqueueForGuardians(db, p.studentId, p.status, `attendance:${p.studentId}:${p.isoDate}:${p.status}`, { school, student, date });
  });
}

export function notifyGateRelease(db: Db, p: { studentId: string; logId: string; collectedBy: string; at: Date }) {
  return safely('gate release', async () => {
    const [school, student] = await Promise.all([schoolName(db), studentName(db, p.studentId)]);
    await enqueueForGuardians(db, p.studentId, 'gate_release', `gate:${p.logId}`, { school, student, time: lagosTime(p.at), collectedBy: p.collectedBy });
  });
}

export function notifyResultsReleased(db: Db, p: { studentIds: string[]; term: string; releaseKey: string }) {
  return safely('results', async () => {
    const school = await schoolName(db);
    for (const studentId of p.studentIds) {
      const student = await studentName(db, studentId);
      await enqueueForGuardians(db, studentId, 'results_released', `results:${p.releaseKey}:${studentId}`, { school, student, term: p.term });
    }
  });
}

/** One notice to every guardian of the students in the audience: the whole school, or one class. */
export async function notifyBroadcast(db: Db, p: { studentIds: string[]; subject: string; text: string; broadcastKey: string; channel?: Channel }): Promise<{ queued: number; skipped: number }> {
  const counts = { queued: 0, skipped: 0 };
  await safely('broadcast', async () => {
    const school = await schoolName(db);
    const seen = new Set<string>();
    for (const studentId of p.studentIds) {
      for (const g of await guardiansOf(db, studentId)) {
        // A parent with three children in the audience gets one notice, not three
        if (seen.has(g.guardianId)) continue;
        seen.add(g.guardianId);
        const result = await enqueueMessage(db, {
          event: 'broadcast',
          eventKey: `broadcast:${p.broadcastKey}:${g.guardianId}`,
          studentId,
          guardianId: g.guardianId,
          phone: g.phone,
          email: g.email,
          params: { school, subject: p.subject, text: p.text },
          preferredChannel: p.channel,
        });
        if (result.status === 'queued') counts.queued += 1;
        else if (result.status === 'skipped') counts.skipped += 1;
      }
    }
  });
  return counts;
}
