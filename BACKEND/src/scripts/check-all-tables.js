const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const targetTables = [
  'permissions',
  'role_permissions',
  'audit_logs',
  'student_documents',
  'student_behaviour',
  'student_timeline',
  'workflow_definitions',
  'workflow_instances',
  'workflow_steps',
  'notification_channels',
  'notification_templates',
  'notification_logs',
  'fee_structures',
  'student_financial_accounts',
  'fee_invoices',
  'fee_discounts',
  'fee_transactions',
  'school_events',
  'documents',
  'timetable_constraints',
  'timetable_versions',
  'timetable_slots',
  'authorized_pickup_persons',
  'pickup_logs',
  'inventory_items',
  'procurement_requests',
  'expenditures',
  'petty_cash',
  'bank_accounts',
  'staff_attendance',
  'staff_broadcasts',
  'staff_leaves',
  'staff_applications'
];

async function checkTables() {
  console.log('--- Checking Supabase Schema Status ---');
  let missing = [];
  let existing = [];

  for (const table of targetTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      missing.push(table);
    } else if (error) {
      // If error is not PGRST205 (e.g. RLS or empty), table exists in schema cache
      existing.push(table);
    } else {
      existing.push(table);
    }
  }

  console.log(`Existing tables: ${existing.length}/${targetTables.length}`);
  if (existing.length > 0) console.log('Active:', existing.join(', '));
  console.log(`Missing tables: ${missing.length}/${targetTables.length}`);
  if (missing.length > 0) console.log('Missing:', missing.join(', '));

  return { missing, existing };
}

checkTables();
