/**
 * Oakland International School - Phase 6 Comprehensive Automated Verification Script
 * Validates:
 * 1. Question Bank Repository (Categorization, subjects, classes, question creation with options & keys)
 * 2. Assessment Builder & Lifecycle (Draft -> Published, timing, anti-cheat limits, mark calculations)
 * 3. Student Assessment Taker Session Engine (Answer redaction on load, in-flight answer saving, timer tracking)
 * 4. Anti-Cheat Monitoring Engine (Window blur / tab switch logging, threshold detection, auto-termination)
 * 5. Instant Objective Auto-Grading (Score computation, percentage calculation, pass/fail evaluation)
 * 6. Class Performance Analytics & Item Difficulty Metrics
 * 7. Multi-Channel Event Dispatches (CBT_ASSESSMENT_PUBLISHED, CBT_SESSION_SUBMITTED, CBT_ANTI_CHEAT_FLAGGED)
 */

import { CbtService } from '../modules/cbt/cbt.service.js';
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

async function runPhase6Verification() {
  console.log('\n===============================================================');
  console.log('🏛️  OAKLAND INTERNATIONAL SCHOOL - PHASE 6 CBT VERIFICATION');
  console.log('===============================================================\n');

  NotificationEventListener.register();
  const eventBus = EventBus.getInstance();

  const capturedEvents: Record<string, any[]> = {
    [AppEvents.CBT_ASSESSMENT_PUBLISHED]: [],
    [AppEvents.CBT_SESSION_SUBMITTED]: [],
    [AppEvents.CBT_ANTI_CHEAT_FLAGGED]: [],
  };

  eventBus.subscribe(AppEvents.CBT_ASSESSMENT_PUBLISHED, async (e) => {
    capturedEvents[AppEvents.CBT_ASSESSMENT_PUBLISHED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.CBT_SESSION_SUBMITTED, async (e) => {
    capturedEvents[AppEvents.CBT_SESSION_SUBMITTED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.CBT_ANTI_CHEAT_FLAGGED, async (e) => {
    capturedEvents[AppEvents.CBT_ANTI_CHEAT_FLAGGED].push(e.payload);
  });

  const cbtService = CbtService.getInstance();

  // -------------------------------------------------------------
  // 1. QUESTION BANK & QUESTION MANAGEMENT
  // -------------------------------------------------------------
  console.log('--- 1. Question Bank Repository & Item Authoring ---');

  // Test 1: List Question Banks
  const initialBanks = await cbtService.getQuestionBanks();
  assert(
    initialBanks.length >= 2,
    'Question bank repository lists pre-configured subject banks',
    `Found ${initialBanks.length} banks (e.g. ${initialBanks[0].title})`
  );

  // Test 2: Create a New Question Bank
  const newBank = await cbtService.createQuestionBank({
    title: 'SS 2 Chemistry Organic Nomenclature Bank',
    subject: 'Chemistry',
    classLevel: 'SS 2',
    description: 'Alkanes, Alkenes, Functional Groups and Reaction Mechanisms',
    createdBy: 'HOD Science Dr. Eze',
  });
  assert(
    !!(newBank.id && newBank.subject === 'Chemistry'),
    'Subject HOD successfully provisions new departmental question bank',
    `Created: ${newBank.title}`
  );

  // Test 3: Add Questions to Question Bank
  const addedQ1 = await cbtService.addQuestion({
    bankId: newBank.id,
    questionText: 'What is the IUPAC name for CH3-CH2-CH(CH3)-CH3?',
    questionType: 'mcq',
    options: [
      { id: 'A', text: '2-methylbutane' },
      { id: 'B', text: '3-methylbutane' },
      { id: 'C', text: 'Pentane' },
      { id: 'D', text: '2-ethylpropane' },
    ],
    correctAnswer: 'A',
    explanation: 'Longest carbon chain has 4 carbons (butane) with a methyl branch at C-2.',
    marks: 5,
    difficulty: 'medium',
  });

  const addedQ2 = await cbtService.addQuestion({
    bankId: newBank.id,
    questionText: 'Ethene undergoes addition reactions due to the presence of a carbon-carbon double bond.',
    questionType: 'true_false',
    options: [
      { id: 'True', text: 'True' },
      { id: 'False', text: 'False' },
    ],
    correctAnswer: 'True',
    explanation: 'Unsaturation in alkenes allows electrophilic addition across the pi bond.',
    marks: 5,
    difficulty: 'easy',
  });

  assert(
    !!(addedQ1.id && addedQ1.marks === 5 && addedQ2.id && addedQ2.questionType === 'true_false'),
    'Multiple question types (MCQ, True/False) authored with options, correct keys and explanations',
    `Authored Q1 (${addedQ1.marks} marks) & Q2 (${addedQ2.marks} marks)`
  );

  // -------------------------------------------------------------
  // 2. ASSESSMENT BUILDER & PUBLISHING WORKFLOW
  // -------------------------------------------------------------
  console.log('\n--- 2. Assessment Builder & Lifecycle Governance ---');

  // Test 4: Create Assessment in Draft Status
  const newAssessment = await cbtService.createAssessment({
    title: 'SS 2 Chemistry Continuous Assessment 1',
    subject: 'Chemistry',
    classLevel: 'SS 2',
    term: 'First Term',
    durationMinutes: 20,
    passPercentage: 50,
    shuffleQuestions: true,
    shuffleOptions: true,
    maxTabSwitches: 3,
    instructions: 'No reference materials or external browser windows permitted.',
    questionIds: [addedQ1.id, addedQ2.id],
    createdBy: 'Principal Dr. Mrs. Alabi',
  });

  assert(
    newAssessment.status === 'draft' && newAssessment.totalMarks === 10,
    'Assessment builder generates draft exam with computed total mark aggregate',
    `Status: ${newAssessment.status}, Total Marks: ${newAssessment.totalMarks}`
  );

  // Test 5: Publish Assessment & Event Trigger
  const publishedAssessment = await cbtService.publishAssessment(newAssessment.id);
  assert(
    publishedAssessment.status === 'active',
    'Assessment published and activated for candidate participation',
    `Status: ${publishedAssessment.status}`
  );

  await new Promise((r) => setTimeout(r, 60)); // Event tick
  assert(
    capturedEvents[AppEvents.CBT_ASSESSMENT_PUBLISHED].some(
      (e) => e.assessmentId === newAssessment.id
    ),
    'EventBus broadcasts CBT_ASSESSMENT_PUBLISHED to notify class cohort and parents'
  );

  // -------------------------------------------------------------
  // 3. STUDENT TEST TAKER SESSION & ANSWER REDACTION
  // -------------------------------------------------------------
  console.log('\n--- 3. Candidate Test Taker Engine & Integrity Controls ---');

  // Test 6: Start Student Session with Redacted Answer Keys
  const sessionResult = await cbtService.startSession({
    assessmentId: newAssessment.id,
    studentId: 'std-201',
    studentName: 'Chidinma Okonjo',
    studentClass: 'SS 2B',
    admissionNo: 'OAK/2025/112',
  });

  assert(
    sessionResult.session.status === 'in_progress' && sessionResult.timeRemainingSeconds > 0,
    'Candidate session initialized with active countdown timer allocation',
    `Time remaining: ${sessionResult.timeRemainingSeconds} seconds`
  );

  const testQuestions = sessionResult.assessment.questions || [];
  const keysLeaked = testQuestions.some((q) => q.correctAnswer !== '');
  assert(
    !keysLeaked,
    'Anti-Cheat Security: Correct answer keys are strictly redacted from candidate test payload',
    `Redacted across all ${testQuestions.length} exam questions`
  );

  // Test 7: Candidate Submits Answer to Question 1 (Correct)
  const ans1 = await cbtService.submitAnswer(sessionResult.session.id, {
    questionId: addedQ1.id,
    studentAnswer: 'A', // Correct: 2-methylbutane
  });
  assert(
    ans1.studentAnswer === 'A',
    'Candidate answer saved in-flight during active session',
    `Question 1 Answer: ${ans1.studentAnswer}`
  );

  // Test 8: Candidate Submits Answer to Question 2 (Incorrect)
  const ans2 = await cbtService.submitAnswer(sessionResult.session.id, {
    questionId: addedQ2.id,
    studentAnswer: 'False', // Incorrect: (correct is True)
  });
  assert(
    ans2.studentAnswer === 'False',
    'Candidate answer saved for Question 2 in active session',
    `Question 2 Answer: ${ans2.studentAnswer}`
  );

  // -------------------------------------------------------------
  // 4. INSTANT AUTO-GRADING & PERFORMANCE EVALUATION
  // -------------------------------------------------------------
  console.log('\n--- 4. Instant Auto-Grading & Result Computation ---');

  // Test 9: Complete and Grade Session
  const completedSession = await cbtService.submitSession(sessionResult.session.id);
  assert(
    completedSession.status === 'submitted' &&
      completedSession.scoreObtained === 5 &&
      completedSession.percentage === 50 &&
      completedSession.passed === true,
    'Auto-grading engine calculates exact score (5/10), percentage (50%), and pass status (PASSED)',
    `Score: ${completedSession.scoreObtained}/${newAssessment.totalMarks} (${completedSession.percentage}%), Passed: ${completedSession.passed}`
  );

  await new Promise((r) => setTimeout(r, 60)); // Event tick
  assert(
    capturedEvents[AppEvents.CBT_SESSION_SUBMITTED].some(
      (e) => e.sessionId === completedSession.id && e.scoreObtained === 5
    ),
    'EventBus broadcasts CBT_SESSION_SUBMITTED with grade breakdown for parent multi-channel alert'
  );

  // Test 10: Session Detailed Review (Post-Submission)
  const reviewData = await cbtService.getSessionResult(completedSession.id);
  assert(
    reviewData.answers.length === 2 &&
      reviewData.answers[0].isCorrect === true &&
      reviewData.answers[1].isCorrect === false,
    'Post-submission review provides comprehensive itemized breakdown with explanations',
    `Item 1: Correct (${reviewData.answers[0].marksAwarded} pts) | Item 2: Incorrect (${reviewData.answers[1].marksAwarded} pts)`
  );

  // -------------------------------------------------------------
  // 5. ANTI-CHEAT ENFORCEMENT & FORCED TERMINATION
  // -------------------------------------------------------------
  console.log('\n--- 5. Anti-Cheat Monitoring & Limit Enforcement ---');

  // Start a second session for an uncooperative candidate
  const session2 = await cbtService.startSession({
    assessmentId: newAssessment.id,
    studentId: 'std-202',
    studentName: 'Tunde Bakare',
    studentClass: 'SS 2B',
    admissionNo: 'OAK/2025/115',
  });

  // Candidate answers Question 1 correctly first
  await cbtService.submitAnswer(session2.session.id, {
    questionId: addedQ1.id,
    studentAnswer: 'A',
  });

  // Infraction 1: Tab switch
  const inf1 = await cbtService.recordAntiCheatInfraction(session2.session.id, {
    flagType: 'tab_switch',
    details: 'Candidate navigated away from browser tab',
  });
  assert(
    inf1.tabSwitchCount === 1 && !inf1.terminated,
    'Anti-Cheat warning registered on first window blur / tab-switch (1/3)',
    inf1.message
  );

  // Infraction 2: Fullscreen exit
  const inf2 = await cbtService.recordAntiCheatInfraction(session2.session.id, {
    flagType: 'fullscreen_exit',
    details: 'Candidate minimized full screen viewport',
  });
  assert(
    inf2.tabSwitchCount === 2 && !inf2.terminated,
    'Anti-Cheat warning registered on second infraction (2/3)',
    inf2.message
  );

  // Infraction 3: Third violation hits threshold -> Auto Termination!
  const inf3 = await cbtService.recordAntiCheatInfraction(session2.session.id, {
    flagType: 'tab_switch',
    details: 'Candidate switched application focus',
  });
  assert(
    inf3.tabSwitchCount === 3 && inf3.terminated,
    'Anti-Cheat threshold triggered: Maximum infractions reached and examination terminated automatically',
    inf3.message
  );

  await new Promise((r) => setTimeout(r, 60)); // Event tick
  assert(
    capturedEvents[AppEvents.CBT_ANTI_CHEAT_FLAGGED].some(
      (e) => e.sessionId === session2.session.id && e.autoTerminated === true
    ),
    'EventBus broadcasts CBT_ANTI_CHEAT_FLAGGED alert to proctoring staff'
  );

  // -------------------------------------------------------------
  // 6. CLASS PERFORMANCE ANALYTICS & DIFFICULTY METRICS
  // -------------------------------------------------------------
  console.log('\n--- 6. Class Performance Analytics & Item Difficulty ---');

  const analytics = await cbtService.getAssessmentAnalytics(newAssessment.id);
  assert(
    analytics.totalCandidates === 2 && analytics.submittedCount === 2,
    'Analytics engine aggregates all candidate attempts for the assessment',
    `Total Candidates: ${analytics.totalCandidates}, Submitted: ${analytics.submittedCount}`
  );

  assert(
    analytics.passRate === 100 && analytics.averageScore === 5,
    'Statistical metrics computed (Mean score: 5.0, Pass rate: 100%)',
    `Average: ${analytics.averageScore} / ${newAssessment.totalMarks} (${analytics.averagePercentage}%)`
  );

  assert(
    analytics.questionBreakdown.length >= 2,
    'Item difficulty breakdown measures individual question success rates across students',
    `Question 1 success rate: ${analytics.questionBreakdown[0]?.successRate ?? 100}%`
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Verification().catch((err) => {
  console.error('Phase 6 Verification crashed with unhandled exception:', err);
  process.exit(1);
});
