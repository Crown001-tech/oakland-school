/**
 * Oakland International School - Phase 4 Comprehensive Automated Verification Script
 * Validates:
 * 1. School Calendar (CRUD, audience filtering, automated multi-channel reminder broadcasting)
 * 2. Oakland Document Centre (Central registry, type filtering, student association, auto-receipt indexing)
 * 3. Constraint-Based Timetable Solver (CSP backtracking solver, zero hard collisions, morning core optimization, version publishing)
 * 4. Domain Event Bus dispatches (CALENDAR_EVENT_SCHEDULED, CALENDAR_EVENT_REMINDER, DOCUMENT_UPLOADED, TIMETABLE_VERSION_PUBLISHED)
 */

import { CalendarService } from '../modules/calendar/calendar.service.js';
import { DocumentService } from '../modules/documents/document.service.js';
import { TimetableSolverService, CLASSES, DAYS, INSTRUCTIONAL_PERIODS } from '../modules/timetable/timetable-solver.service.js';
import { EventBus } from '../common/events/event-bus.js';
import { AppEvents } from '../common/events/event-types.js';
import { NotificationEventListener } from '../common/events/listeners/notification.listener.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function runPhase4Verification() {
  console.log('\n===============================================================');
  console.log('🏛️  OAKLAND INTERNATIONAL SCHOOL - PHASE 4 VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Initialize listeners
  NotificationEventListener.register();
  const eventBus = EventBus.getInstance();

  const capturedEvents: Record<string, any[]> = {
    [AppEvents.CALENDAR_EVENT_SCHEDULED]: [],
    [AppEvents.CALENDAR_EVENT_REMINDER]: [],
    [AppEvents.DOCUMENT_UPLOADED]: [],
    [AppEvents.TIMETABLE_VERSION_PUBLISHED]: [],
  };

  eventBus.subscribe(AppEvents.CALENDAR_EVENT_SCHEDULED, async (e) => {
    capturedEvents[AppEvents.CALENDAR_EVENT_SCHEDULED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.CALENDAR_EVENT_REMINDER, async (e) => {
    capturedEvents[AppEvents.CALENDAR_EVENT_REMINDER].push(e.payload);
  });
  eventBus.subscribe(AppEvents.DOCUMENT_UPLOADED, async (e) => {
    capturedEvents[AppEvents.DOCUMENT_UPLOADED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.TIMETABLE_VERSION_PUBLISHED, async (e) => {
    capturedEvents[AppEvents.TIMETABLE_VERSION_PUBLISHED].push(e.payload);
  });

  // -------------------------------------------------------------
  // 1. SCHOOL CALENDAR VERIFICATION
  // -------------------------------------------------------------
  console.log('--- 1. School Calendar & Operational Scheduling ---');
  const calendarService = CalendarService.getInstance();

  const allEvents = await calendarService.getEvents();
  assert(allEvents.length >= 7, 'Default institutional events seeded successfully', `Count: ${allEvents.length}`);

  const parentEvents = await calendarService.getEvents({ audience: 'parents' });
  assert(
    parentEvents.some((e) => e.title.includes('PTA')),
    'Audience filter returns Parent-Teacher Association events'
  );

  const examEvents = await calendarService.getEvents({ eventType: 'examination' });
  assert(
    examEvents.length > 0 && examEvents[0].eventType === 'examination',
    'Event type filter correctly isolates examination series'
  );

  // Create new event
  const newEvent = await calendarService.createEvent({
    title: 'Inter-School Science Olympiad Invitational',
    description: 'Statewide STEM competition hosted at Oakland Main Campus.',
    eventType: 'academic',
    startDate: '2026-11-20T09:00:00.000Z',
    endDate: '2026-11-20T16:00:00.000Z',
    audience: 'all',
    location: 'Oakland STEM Wing Lab 1',
    notifyBeforeDays: 3,
  }, 'Principal-001');
  await new Promise((r) => setTimeout(r, 60));

  assert(Boolean(newEvent.id), 'Successfully created new school event', `ID: ${newEvent.id}`);
  assert(
    capturedEvents[AppEvents.CALENDAR_EVENT_SCHEDULED].length > 0,
    'AppEvents.CALENDAR_EVENT_SCHEDULED emitted on event scheduling'
  );

  // Update event
  const updatedEvent = await calendarService.updateEvent(newEvent.id, {
    location: 'Oakland Multipurpose Science Centre',
  });
  assert(
    updatedEvent.location === 'Oakland Multipurpose Science Centre',
    'Successfully updated event venue and persisted updates'
  );

  // Broadcast reminder
  const reminderResult = await calendarService.broadcastEventReminder(newEvent.id);
  await new Promise((r) => setTimeout(r, 60));
  assert(
    reminderResult.success && reminderResult.recipientsCount > 0,
    'Successfully broadcasted automated multi-channel event reminder',
    `Recipients: ${reminderResult.recipientsCount}`
  );
  assert(
    capturedEvents[AppEvents.CALENDAR_EVENT_REMINDER].length > 0,
    'AppEvents.CALENDAR_EVENT_REMINDER emitted to trigger notification dispatch'
  );

  // -------------------------------------------------------------
  // 2. OAKLAND DOCUMENT CENTRE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 2. Oakland Central Document Registry ---');
  const docService = DocumentService.getInstance();

  const allDocs = await docService.getDocuments();
  assert(allDocs.length >= 6, 'Seed institutional policies and records available', `Count: ${allDocs.length}`);

  const policies = await docService.getDocuments({ documentType: 'policy' });
  assert(
    policies.length >= 2 && policies.every((p) => p.documentType === 'policy'),
    'Filtered documents by type "policy" successfully'
  );

  const studentDocs = await docService.getStudentDocuments('std-101');
  assert(
    studentDocs.length >= 2,
    'Linked student records retrieved correctly for Student 360 / Parent portal',
    `Count: ${studentDocs.length}`
  );

  // Index new fee receipt
  const indexedReceipt = await docService.indexGeneratedReceipt({
    receiptNo: 'REC-2026-999',
    studentId: 'std-101',
    studentName: 'Emeka Adeleke',
    amount: 150000,
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    indexedReceipt.documentType === 'receipt' && indexedReceipt.associatedStudentId === 'std-101',
    'Auto-indexer successfully vaulted fee payment receipt into central registry'
  );
  assert(
    capturedEvents[AppEvents.DOCUMENT_UPLOADED].length > 0,
    'AppEvents.DOCUMENT_UPLOADED emitted on document archival'
  );

  // Search documents
  const searchResults = await docService.getDocuments({ search: 'curriculum' });
  assert(
    searchResults.length > 0 && searchResults[0].title.toLowerCase().includes('curriculum'),
    'Document search across title and tags functions accurately'
  );

  // -------------------------------------------------------------
  // 3. CONSTRAINT-BASED TIMETABLE SOLVER VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 3. Constraint-Based Timetable Solver Engine ---');
  const solverService = TimetableSolverService.getInstance();

  const constraints = await solverService.getConstraints();
  assert(constraints.length >= 5, 'Retrieved active hard and soft solver constraints', `Count: ${constraints.length}`);

  console.log('  ⚙️ Executing CSP Backtracking Timetable Solver across JSS 1 - SS 3...');
  const solveResult = await solverService.solveTimetable({
    academicYear: '2026/2027',
    term: 'Term 1',
  });

  assert(
    solveResult.status === 'optimal' || solveResult.status === 'feasible',
    'CSP Solver completed with valid solution status',
    `Status: ${solveResult.status}, Runtime: ${solveResult.executionTimeMs}ms`
  );

  assert(
    solveResult.hardConflictsCount === 0,
    'Zero hard teacher/class collision violations achieved',
    `Conflicts: ${solveResult.hardConflictsCount}`
  );

  assert(
    solveResult.metrics.coreMorningSatisfactionPct >= 80,
    'Core academic subjects preferentially scheduled in morning periods',
    `Morning Core Rate: ${solveResult.metrics.coreMorningSatisfactionPct}%`
  );

  assert(
    solveResult.satisfactionScore >= 90,
    'Overall soft constraint satisfaction score exceeds 90%',
    `Score: ${solveResult.satisfactionScore}%`
  );

  // Deep validation of teacher non-clash invariant
  let teacherClashesDetected = 0;
  for (const day of DAYS) {
    for (const period of INSTRUCTIONAL_PERIODS) {
      const activeTeachersInSlot = new Set<string>();
      for (const cls of CLASSES) {
        const cell = solveResult.grid[cls]?.[period]?.[day];
        if (
          !cell ||
          !cell.teacher ||
          cell.teacher === 'Principal' ||
          cell.teacher === 'Staff on Duty' ||
          cell.teacher === 'Sports Directorate'
        ) {
          continue;
        }

        if (activeTeachersInSlot.has(cell.teacher)) {
          teacherClashesDetected++;
          console.error(`    Clash: ${cell.teacher} double booked at ${day} ${period} in ${cls}`);
        }
        activeTeachersInSlot.add(cell.teacher);
      }
    }
  }

  assert(
    teacherClashesDetected === 0,
    'Mathematical invariant verified: No teacher is double-booked across any two classrooms simultaneously'
  );

  // Version and Publish
  const publishedVersion = await solverService.publishVersion(solveResult.versionId, 'Dr. Principal');
  assert(
    publishedVersion.status === 'published',
    'Master timetable version published as official institutional schedule',
    `Version ID: ${publishedVersion.id}`
  );
  assert(
    capturedEvents[AppEvents.TIMETABLE_VERSION_PUBLISHED].length > 0,
    'AppEvents.TIMETABLE_VERSION_PUBLISHED emitted to sync across Teacher and Proprietor portals'
  );

  const master = await solverService.getMasterTimetable();
  assert(
    master.version?.id === publishedVersion.id,
    'Active published master schedule returned for portal consumers'
  );

  console.log('\n===============================================================');
  console.log(`📊 PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
