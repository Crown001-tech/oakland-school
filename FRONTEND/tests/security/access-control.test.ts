import { describe, it, expect, beforeEach } from 'vitest';
import { checkApiAccess, isParentAuthorizedForStudent } from '@/lib/api-guard';
import { signRoleCookie, verifyRoleCookie } from '@/lib/auth-role';

describe('M0 Security & Access Control Gate (Real Application Logic)', () => {
  const secretKey = 'test-secret-key-32-chars-long-minimum-size!!';
  beforeEach(() => {
    process.env.AUTH_COOKIE_SECRET = secretKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = secretKey;
  });

  // ----------------------------------------------------------------------------
  // 1. EXIT GATE TEST: Parent Isolation & Anti-IDOR Verification
  // ----------------------------------------------------------------------------
  describe('PROVES M0 EXIT GATE: Parent Cannot Access Another Family Child', () => {
    const parentSmithGuardianId = 'guard-smith-001';
    const parentDoeGuardianId = 'guard-doe-002';

    const studentSmithId = 'student-smith-chinedu-101';
    const studentDoeId = 'student-doe-amina-102';

    const dbGuardianLinks = [
      { guardian_id: parentSmithGuardianId, student_id: studentSmithId },
      { guardian_id: parentDoeGuardianId, student_id: studentDoeId },
    ];

    it('allows a verified parent to access their own linked child', () => {
      const isAllowed = isParentAuthorizedForStudent(
        studentSmithId,
        parentSmithGuardianId,
        dbGuardianLinks
      );
      expect(isAllowed).toBe(true);
    });

    it('strictly forbids a parent from accessing another family child (cross-family IDOR)', () => {
      const isAllowed = isParentAuthorizedForStudent(
        studentDoeId,
        parentSmithGuardianId,
        dbGuardianLinks
      );
      expect(isAllowed).toBe(false);
    });

    it('strictly forbids access when parent has no guardian links', () => {
      const orphanParentId = 'guard-orphan-999';
      const isAllowed = isParentAuthorizedForStudent(
        studentSmithId,
        orphanParentId,
        dbGuardianLinks
      );
      expect(isAllowed).toBe(false);
    });

    it('strictly forbids access when target student ID or guardian ID is null / undefined', () => {
      expect(isParentAuthorizedForStudent('', parentSmithGuardianId, dbGuardianLinks)).toBe(false);
      expect(isParentAuthorizedForStudent(studentSmithId, null, dbGuardianLinks)).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Real checkApiAccess Middleware Enforcer Tests
  // ----------------------------------------------------------------------------
  describe('Central checkApiAccess Enforcement', () => {
    it('permits public endpoints without an active session', () => {
      const publicEndpoints = [
        { path: '/api/auth/login', method: 'POST' },
        { path: '/api/auth/activate-student', method: 'POST' },
        { path: '/api/auth/logout', method: 'POST' },
        { path: '/api/auth/me', method: 'GET' },
        { path: '/api/admissions', method: 'POST' },
        { path: '/api/register/staff', method: 'POST' },
        { path: '/api/schools/profile', method: 'GET' },
      ];

      for (const ep of publicEndpoints) {
        const denial = checkApiAccess({
          pathname: ep.path,
          method: ep.method,
          role: undefined,
          hasSession: false,
          searchParams: new URLSearchParams(),
        });
        expect(denial).toBeNull();
      }
    });

    it('denies access with 401 when unauthenticated on protected routes', () => {
      const protectedEndpoints = [
        { path: '/api/audit-logs', method: 'GET' },
        { path: '/api/finances', method: 'GET' },
        { path: '/api/students', method: 'GET' },
        { path: '/api/schools/settings', method: 'POST' },
      ];

      for (const ep of protectedEndpoints) {
        const denial = checkApiAccess({
          pathname: ep.path,
          method: ep.method,
          role: undefined,
          hasSession: false,
          searchParams: new URLSearchParams(),
        });
        expect(denial).not.toBeNull();
        expect(denial?.status).toBe(401);
      }
    });

    it('enforces RBAC on sensitive institutional endpoints', () => {
      // Audit logs: Proprietor & Admin only
      expect(
        checkApiAccess({
          pathname: '/api/audit-logs',
          method: 'GET',
          role: 'teacher',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })?.status
      ).toBe(403);

      expect(
        checkApiAccess({
          pathname: '/api/audit-logs',
          method: 'GET',
          role: 'parent',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })?.status
      ).toBe(403);

      expect(
        checkApiAccess({
          pathname: '/api/audit-logs',
          method: 'GET',
          role: 'proprietor',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })
      ).toBeNull();

      expect(
        checkApiAccess({
          pathname: '/api/audit-logs',
          method: 'GET',
          role: 'principal',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })
      ).toBeNull();

      // Finance write: Bursar and Admin only (Teacher denied)
      expect(
        checkApiAccess({
          pathname: '/api/finances',
          method: 'POST',
          role: 'teacher',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })?.status
      ).toBe(403);

      expect(
        checkApiAccess({
          pathname: '/api/finances',
          method: 'POST',
          role: 'bursar',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })
      ).toBeNull();
    });

    it('restricts security guards strictly to physical security boundaries', () => {
      // Allowed security endpoints
      expect(
        checkApiAccess({
          pathname: '/api/security/incidents',
          method: 'GET',
          role: 'security',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })
      ).toBeNull();

      expect(
        checkApiAccess({
          pathname: '/api/pickup/verify',
          method: 'POST',
          role: 'security',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })
      ).toBeNull();

      // Forbidden financial / audit endpoints for security
      expect(
        checkApiAccess({
          pathname: '/api/finances',
          method: 'GET',
          role: 'security',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })?.status
      ).toBe(403);

      expect(
        checkApiAccess({
          pathname: '/api/audit-logs',
          method: 'GET',
          role: 'security',
          hasSession: true,
          searchParams: new URLSearchParams(),
        })?.status
      ).toBe(403);
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Cryptographic Role Cookie Signing and Expiry Tests
  // ----------------------------------------------------------------------------
  describe('Cryptographic Role Cookie Verification', () => {
    it('correctly signs and verifies a valid role cookie', async () => {
      const userId = 'usr-test-12345';
      const cookieVal = await signRoleCookie('teacher', userId);
      expect(cookieVal).toBeTruthy();

      const verifiedRole = await verifyRoleCookie(cookieVal, userId);
      expect(verifiedRole).toBe('teacher');
    });

    it('rejects a cookie presented for a different user ID', async () => {
      const userA = 'usr-alice-111';
      const userB = 'usr-bob-222';

      const aliceCookie = await signRoleCookie('admin', userA);
      const verified = await verifyRoleCookie(aliceCookie, userB);
      expect(verified).toBeUndefined();
    });

    it('rejects a cookie with tampered role signature', async () => {
      const userId = 'usr-carol-333';
      const legitimateCookie = await signRoleCookie('teacher', userId);

      // Attempt privilege escalation by swapping 'teacher' for 'proprietor'
      const tampered = legitimateCookie.replace(/^teacher\./, 'proprietor.');
      const verified = await verifyRoleCookie(tampered, userId);
      expect(verified).toBeUndefined();
    });

    it('rejects an expired role cookie', async () => {
      const userId = 'usr-expired-444';
      // Create a cookie format with expired timestamp (yesterday)
      const pastTime = Date.now() - 1000 * 60 * 60 * 24;
      const payload = `bursar.${userId}.${pastTime}`;

      // Sign with real secret
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const sig = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const expiredCookie = `${payload}.${sig}`;
      const verified = await verifyRoleCookie(expiredCookie, userId);
      expect(verified).toBeUndefined();
    });
  });
});
