/**
 * Oakland International School - Phase 5 Comprehensive Automated Verification Script
 * Validates:
 * 1. Student Pickup Verification & Safety (QR lookup, escort registry, cleared departures, safety SMS alerts, security flagging)
 * 2. Institutional Procurement & Inventory Management (Stock ledger, low-stock threshold, requisition workflow approval, auto-restocking on delivery)
 * 3. Domain Event Bus dispatches (STUDENT_PICKUP_RECORDED, SECURITY_PICKUP_FLAGGED, PROCUREMENT_REQUEST_SUBMITTED, PROCUREMENT_STATUS_CHANGED)
 */

import { PickupService } from '../modules/pickup/pickup.service.js';
import { InventoryService } from '../modules/inventory/inventory.service.js';
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

async function runPhase5Verification() {
  console.log('\n===============================================================');
  console.log('🏛️  OAKLAND INTERNATIONAL SCHOOL - PHASE 5 VERIFICATION SUITE');
  console.log('===============================================================\n');

  NotificationEventListener.register();
  const eventBus = EventBus.getInstance();

  const capturedEvents: Record<string, any[]> = {
    [AppEvents.STUDENT_PICKUP_RECORDED]: [],
    [AppEvents.SECURITY_PICKUP_FLAGGED]: [],
    [AppEvents.PROCUREMENT_REQUEST_SUBMITTED]: [],
    [AppEvents.PROCUREMENT_STATUS_CHANGED]: [],
  };

  eventBus.subscribe(AppEvents.STUDENT_PICKUP_RECORDED, async (e) => {
    capturedEvents[AppEvents.STUDENT_PICKUP_RECORDED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.SECURITY_PICKUP_FLAGGED, async (e) => {
    capturedEvents[AppEvents.SECURITY_PICKUP_FLAGGED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.PROCUREMENT_REQUEST_SUBMITTED, async (e) => {
    capturedEvents[AppEvents.PROCUREMENT_REQUEST_SUBMITTED].push(e.payload);
  });
  eventBus.subscribe(AppEvents.PROCUREMENT_STATUS_CHANGED, async (e) => {
    capturedEvents[AppEvents.PROCUREMENT_STATUS_CHANGED].push(e.payload);
  });

  // -------------------------------------------------------------
  // 1. GATE SECURITY & STUDENT PICKUP VERIFICATION
  // -------------------------------------------------------------
  console.log('--- 1. Gate Security & Student Pickup Verification ---');
  const pickupService = PickupService.getInstance();

  // Test 1: Valid QR Lookup
  const validLookup = await pickupService.lookupByQR('OAK-PK-8812');
  assert(
    validLookup.isValid && validLookup.authorizedPerson?.fullName === 'Chief Adeleke',
    'Cryptographic QR token lookup successfully authenticates authorized parent',
    `Resolved: ${validLookup.authorizedPerson?.fullName} (${validLookup.student?.name})`
  );

  // Test 2: Invalid QR Lookup
  const invalidLookup = await pickupService.lookupByQR('FAKE-QR-0000');
  assert(
    !invalidLookup.isValid,
    'Invalid or fraudulent QR token rejected immediately at gate'
  );

  // Test 3: Register New Authorized Escort
  const newEscort = await pickupService.registerAuthorizedPerson({
    studentId: 'std-101',
    fullName: 'Auntie Ronke Adeleke',
    relationship: 'Aunt / Emergency Guardian',
    phone: '+2348059998877',
    nationalId: 'NIN-5544332211',
  });
  assert(
    Boolean(newEscort.qrToken) && newEscort.qrToken.startsWith('OAK-PK-'),
    'New authorized escort registered with generated security QR pass',
    `QR: ${newEscort.qrToken}`
  );

  // Test 4: Record Cleared Student Departure
  const clearedLog = await pickupService.recordPickup({
    qrToken: 'OAK-PK-8814', // Driver Babatunde Alabi
    verifiedByName: 'Gate Officer Yakubu',
    verificationMethod: 'qr_scan',
    notes: 'Driver biometric visual match verified at Gate 1.',
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    clearedLog.status === 'cleared' && clearedLog.pickedUpByName.includes('Babatunde Alabi'),
    'Student departure cleared upon escort QR validation',
    `Student: ${clearedLog.studentName}, Escort: ${clearedLog.pickedUpByName}`
  );
  assert(
    capturedEvents[AppEvents.STUDENT_PICKUP_RECORDED].length > 0,
    'AppEvents.STUDENT_PICKUP_RECORDED emitted to trigger parent safety SMS/WhatsApp alert'
  );

  // Test 5: Flag Unauthorized Pickup Attempt
  const flaggedLog = await pickupService.flagSecurityAlert({
    studentId: 'std-101',
    studentName: 'Emeka Adeleke',
    attemptedBy: 'Unknown Stranger',
    reason: 'Individual presented no QR pass and is not on authorized registry.',
    gateOfficer: 'Officer Yakubu',
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    flaggedLog.status === 'flagged_unauthorized',
    'Unauthorized attempt flagged and logged in security incident registry'
  );
  assert(
    capturedEvents[AppEvents.SECURITY_PICKUP_FLAGGED].length > 0,
    'AppEvents.SECURITY_PICKUP_FLAGGED emitted to trigger lockdown alert to Principal'
  );

  // Test 6: Audit Logs Stream
  const recentLogs = await pickupService.getRecentLogs(10);
  assert(
    recentLogs.length >= 3,
    'Real-time gate departure audit log stream accessible',
    `Log count: ${recentLogs.length}`
  );

  // -------------------------------------------------------------
  // 2. PROCUREMENT & INVENTORY MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n--- 2. Procurement & Institutional Inventory Management ---');
  const inventoryService = InventoryService.getInstance();

  // Test 7: Inventory Listing & Low Stock Detection
  const allInventory = await inventoryService.getInventory();
  assert(allInventory.length >= 6, 'Seed institutional inventory loaded into ledger', `Count: ${allInventory.length}`);

  const lowStockItems = await inventoryService.getInventory({ lowStockOnly: true });
  assert(
    lowStockItems.length >= 2 && lowStockItems.every((i) => i.status === 'low_stock' || i.status === 'out_of_stock'),
    'Automatic low-stock threshold detection identifies depleted supplies'
  );

  // Test 8: Register New Inventory Item
  const newItem = await inventoryService.createInventoryItem({
    name: 'Cambridge IGCSE Physics Revision Textbooks (10th Ed)',
    category: 'textbooks',
    quantity: 45,
    unit: 'copies',
    reorderLevel: 10,
    unitCost: 18500,
    location: 'Senior Library Annex',
  });
  assert(
    newItem.status === 'in_stock' && newItem.quantity === 45,
    'New resource item registered into central inventory ledger'
  );

  // Test 9: Adjust Stock Quantity
  const adjustedItem = await inventoryService.adjustStock(newItem.id, -40); // 45 - 40 = 5 (< 10 reorderLevel)
  assert(
    adjustedItem.quantity === 5 && adjustedItem.status === 'low_stock',
    'Stock deduction triggers automatic transition to low_stock status'
  );

  // Test 10: Submit Procurement Requisition
  const newReq = await inventoryService.submitProcurementRequest({
    itemName: 'Bacteriological Incubator & Petri Dishes for Lab C',
    category: 'science_lab',
    quantity: 2,
    unit: 'units',
    estimatedUnitCost: 220000,
    justification: 'Required for SS 3 practical terminal examinations.',
    requestedByName: 'Mr. David Ade (Head of Science)',
    urgency: 'critical',
  }, 'staff-001');
  await new Promise((r) => setTimeout(r, 60));

  assert(
    newReq.status === 'pending_principal' && newReq.estimatedTotalCost === 440000,
    'Procurement requisition submitted and initial status routed to Principal',
    `Total Est: ₦${newReq.estimatedTotalCost.toLocaleString()}`
  );
  assert(
    capturedEvents[AppEvents.PROCUREMENT_REQUEST_SUBMITTED].length > 0,
    'AppEvents.PROCUREMENT_REQUEST_SUBMITTED emitted to alert Principal'
  );

  // Test 11: Workflow Engine Escalation (> ₦100,000 passes to Proprietor)
  const escalatedReq = await inventoryService.reviewProcurementRequest(newReq.id, {
    decision: 'approve',
    reviewerName: 'Dr. Principal',
    reviewerRole: 'admin',
    notes: 'Endorsed. Total cost exceeds ₦100k threshold, forwarded to Executive Proprietor.',
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    escalatedReq.status === 'pending_proprietor',
    'Separation of Powers: Requisitions > ₦100k automatically escalate to Executive Proprietor'
  );

  // Test 12: Proprietor Executive Sanction
  const approvedReq = await inventoryService.reviewProcurementRequest(escalatedReq.id, {
    decision: 'approve',
    reviewerName: 'Executive Proprietor',
    reviewerRole: 'proprietor',
    notes: 'Sanctioned. Bursar to issue purchase order voucher.',
  });
  await new Promise((r) => setTimeout(r, 60));

  assert(
    approvedReq.status === 'approved',
    'Executive Proprietor approval sanctions requisition for Bursar purchase'
  );
  assert(
    capturedEvents[AppEvents.PROCUREMENT_STATUS_CHANGED].length >= 2,
    'AppEvents.PROCUREMENT_STATUS_CHANGED emitted across workflow transitions'
  );

  // Test 13: Mark Delivered & Auto-Restock Inventory
  const initialStock = (await inventoryService.getInventory({ search: 'Incubator' })).length;
  const deliveryResult = await inventoryService.markDelivered(approvedReq.id);

  assert(
    deliveryResult.request.status === 'delivered' && deliveryResult.inventoryItem.quantity === 2,
    'Goods receipt marks requisition delivered and automatically stocks inventory ledger'
  );

  console.log('\n===============================================================');
  console.log(`📊 PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
