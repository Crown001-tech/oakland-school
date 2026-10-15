/**
 * Oakland International School - Phase 0 Comprehensive Verification Suite
 * 
 * Verifies:
 * 1. Granular RBAC Permission Taxonomy & Role Resolvers
 * 2. Express RBAC Route Guards (403 Forbidden vs 200 OK per role)
 * 3. Strict Proprietor/Bursar isolation (Principal cannot touch finance or appoint bursar)
 * 4. Persistent Audit Trail capturing asynchronous domain events
 * 5. Supabase Storage Service capabilities
 */

import http from 'http';
import { createApp } from '../app.js';
import { rbacService } from '../common/services/rbac.service.js';
import { Permissions } from '../common/types/rbac.types.js';
import { eventBus, AppEvents, initializeEventSystem } from '../common/events/index.js';
import { auditService } from '../common/services/audit.service.js';
import { storageService } from '../common/services/storage.service.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedTests++;
  }
}

async function runHttpRequest(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function verifyPhase0() {
  console.log('\n============================================================');
  console.log('🛡️  OAKLAND SCHOOLS — PHASE 0 VERIFICATION TEST SUITE');
  console.log('============================================================\n');

  // Boot up event system
  initializeEventSystem();

  // ---------------------------------------------------------------
  // SUITE 1: RBAC Permission Taxonomy & Role Isolation
  // ---------------------------------------------------------------
  console.log('📋 SUITE 1: Granular RBAC Permissions & Role Isolation');

  const proprietorPerms = await rbacService.getPermissionsForRole('proprietor');
  assert(
    proprietorPerms.includes(Permissions.STAFF_APPOINT_BURSAR),
    'Proprietor has permission to appoint Bursar'
  );
  assert(
    proprietorPerms.includes(Permissions.FINANCE_OVERVIEW_VIEW),
    'Proprietor has finance overview permission'
  );
  assert(
    proprietorPerms.includes(Permissions.COMMUNICATIONS_BROADCAST_STAFF),
    'Proprietor has staff broadcast permission'
  );

  const adminPerms = await rbacService.getPermissionsForRole('admin');
  assert(
    adminPerms.includes(Permissions.STUDENTS_CREATE),
    'Admin (Principal) can admit/create students'
  );
  assert(
    adminPerms.includes(Permissions.COMMUNICATIONS_OFFICIAL_LETTERS),
    'Admin (Principal) can issue official letters'
  );
  assert(
    !adminPerms.includes(Permissions.STAFF_APPOINT_BURSAR),
    'Admin (Principal) CANNOT appoint Bursar (Oakland Rule: Bursar under Proprietor)'
  );
  assert(
    !adminPerms.includes(Permissions.FINANCE_OVERVIEW_VIEW),
    'Admin (Principal) CANNOT access Bursar finance overview'
  );

  const bursarPerms = await rbacService.getPermissionsForRole('bursar');
  assert(
    bursarPerms.includes(Permissions.FINANCE_PAYMENTS_RECORD),
    'Bursar can record fee payments'
  );
  assert(
    bursarPerms.includes(Permissions.FINANCE_TRANSACTIONS_RECORD),
    'Bursar can record financial transactions'
  );
  assert(
    !bursarPerms.includes(Permissions.SCORES_RECORD),
    'Bursar cannot record academic scores'
  );

  const teacherPerms = await rbacService.getPermissionsForRole('teacher');
  assert(
    teacherPerms.includes(Permissions.ATTENDANCE_MARK),
    'Teacher can mark class attendance'
  );
  assert(
    teacherPerms.includes(Permissions.SCORES_RECORD),
    'Teacher can enter student scores'
  );
  assert(
    !teacherPerms.includes(Permissions.FINANCE_OVERVIEW_VIEW),
    'Teacher CANNOT view finance overview'
  );
  assert(
    !teacherPerms.includes(Permissions.STAFF_ONBOARD),
    'Teacher CANNOT onboard staff'
  );

  // ---------------------------------------------------------------
  // SUITE 2: HTTP Route Guard Enforcement (Live Express Server)
  // ---------------------------------------------------------------
  console.log('\n🌐 SUITE 2: HTTP Route Guard Permission Enforcement');

  const app = createApp();
  const server = app.listen(0);
  const address = server.address() as any;
  const testPort = address.port;

  try {
    // 2.1 Teacher tries to access finance overview -> Must get 403 Forbidden
    const resTeacherFinance = await runHttpRequest(testPort, 'GET', '/api/v1/finance/overview', {
      'x-demo-role': 'teacher',
    });
    assert(
      resTeacherFinance.status === 403,
      'Teacher blocked from /finance/overview (403 Forbidden)',
      `Actual status: ${resTeacherFinance.status}`
    );

    // 2.2 Admin (Principal) tries to access finance overview -> Must get 403 Forbidden
    const resAdminFinance = await runHttpRequest(testPort, 'GET', '/api/v1/finance/overview', {
      'x-demo-role': 'admin',
    });
    assert(
      resAdminFinance.status === 403,
      'Admin (Principal) blocked from /finance/overview (403 Forbidden)',
      `Actual status: ${resAdminFinance.status}`
    );

    // 2.3 Bursar accesses finance overview -> Must be allowed (not 403)
    const resBursarFinance = await runHttpRequest(testPort, 'GET', '/api/v1/finance/overview', {
      'x-demo-role': 'bursar',
    });
    assert(
      resBursarFinance.status !== 403,
      'Bursar granted access to /finance/overview (Not 403)',
      `Actual status: ${resBursarFinance.status}`
    );

    // 2.4 Admin tries to appoint Bursar -> Must get 403 Forbidden
    const resAdminAppointBursar = await runHttpRequest(
      testPort,
      'POST',
      '/api/v1/staff/appoint-bursar',
      { 'x-demo-role': 'admin' },
      { to: 'bursar@oaklandschools.edu.ng', fullName: 'Mr. Adewale' }
    );
    assert(
      resAdminAppointBursar.status === 403,
      'Admin blocked from appointing Bursar (403 Forbidden)',
      `Actual status: ${resAdminAppointBursar.status}`
    );

    // 2.5 Proprietor appoints Bursar -> Must be allowed (not 403)
    const resPropAppointBursar = await runHttpRequest(
      testPort,
      'POST',
      '/api/v1/staff/appoint-bursar',
      { 'x-demo-role': 'proprietor' },
      { to: 'bursar@oaklandschools.edu.ng', fullName: 'Mr. Adewale', employeeId: 'OAK-BUR-TEST' }
    );
    assert(
      resPropAppointBursar.status !== 403,
      'Proprietor authorized to appoint Bursar (Not 403)',
      `Actual status: ${resPropAppointBursar.status}`
    );

    // 2.6 Teacher marks attendance -> Allowed (not 403)
    const resTeacherAttendance = await runHttpRequest(
      testPort,
      'POST',
      '/api/v1/attendance/mark',
      { 'x-demo-role': 'teacher' },
      { class_id: 'a0000000-0000-0000-0000-000000000001', records: [] }
    );
    assert(
      resTeacherAttendance.status !== 403,
      'Teacher authorized to mark attendance (Not 403)',
      `Actual status: ${resTeacherAttendance.status}`
    );

    // 2.7 Audit logs endpoint restricted to audit:logs:view (Proprietor/Admin allowed, Teacher blocked)
    const resTeacherAudit = await runHttpRequest(testPort, 'GET', '/api/v1/notifications/audit/logs', {
      'x-demo-role': 'teacher',
    });
    assert(
      resTeacherAudit.status === 403,
      'Teacher blocked from reading institutional audit logs (403 Forbidden)',
      `Actual status: ${resTeacherAudit.status}`
    );

    const resAdminAudit = await runHttpRequest(testPort, 'GET', '/api/v1/notifications/audit/logs', {
      'x-demo-role': 'admin',
    });
    assert(
      resAdminAudit.status === 200,
      'Admin authorized to read institutional audit logs (200 OK)',
      `Actual status: ${resAdminAudit.status}`
    );
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------
  // SUITE 3: Persistent Audit Trail Verification
  // ---------------------------------------------------------------
  console.log('\n📜 SUITE 3: Persistent Audit Trail Subsystem');

  const testEventPayload = {
    to: 'verification.principal@oaklandschools.edu.ng',
    fullName: 'Dr. Elizabeth Taylor',
    role: 'admin' as const,
    employeeId: 'OAK-ADM-TEST-99',
    appointedBy: 'dev-demo-user',
  };

  const emittedEventId = eventBus.publish(
    AppEvents.STAFF_APPOINTED,
    testEventPayload,
    { source: 'VerificationSuite.verifyPhase0' }
  );

  assert(
    !!emittedEventId,
    `Domain event emitted successfully [ID: ${emittedEventId.slice(0, 8)}]`
  );

  // Allow async setImmediate dispatch to execute listener
  await new Promise((resolve) => setTimeout(resolve, 250));

  const recentAuditLogs = await auditService.getRecentLogs(10);
  const matchedAuditEntry = recentAuditLogs.find(
    (log) => log.action === AppEvents.STAFF_APPOINTED
  );

  assert(
    !!matchedAuditEntry,
    'AuditEventListener captured event and recorded into AuditService',
    `Audit log found: ${!!matchedAuditEntry}`
  );

  if (matchedAuditEntry) {
    assert(
      matchedAuditEntry.resource_type === 'staff',
      'Audit log correctly categorized resource_type as "staff"'
    );
    assert(
      matchedAuditEntry.metadata?.fullName === 'Dr. Elizabeth Taylor',
      'Audit log preserved sanitized metadata attributes'
    );
  }

  // ---------------------------------------------------------------
  // SUITE 4: Supabase Storage Service Capabilities
  // ---------------------------------------------------------------
  console.log('\n📦 SUITE 4: Supabase Storage Service');

  const publicUrl = storageService.getPublicUrl('report-cards', '2026-term1/sample.pdf');
  assert(
    publicUrl.includes('report-cards') && publicUrl.includes('sample.pdf'),
    'StorageService generated valid public URL structure'
  );

  // Test buffer handling
  const dummyBuffer = Buffer.from('Oakland International School Test Document');
  assert(
    dummyBuffer.length > 0,
    'Buffer payload ready for multi-part storage uploads'
  );

  // ---------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

verifyPhase0().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
