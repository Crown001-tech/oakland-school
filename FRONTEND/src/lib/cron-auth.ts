import crypto from 'node:crypto';

/**
 * The scheduled jobs (sending messages, queuing fee reminders) are called by the hosting platform's scheduler, not
 * by a person. They carry CRON_SECRET as a bearer token (Vercel Cron sends it automatically when CRON_SECRET is set).
 * With no secret set, nobody can run them: a job is never open.
 */
export function isAuthorizedCron(authorization: string | null | undefined, secret: string | undefined = process.env.CRON_SECRET): boolean {
  const s = (secret || '').trim();
  if (s.length < 16 || !authorization) return false;
  const given = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const a = Buffer.from(given);
  const b = Buffer.from(s);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
