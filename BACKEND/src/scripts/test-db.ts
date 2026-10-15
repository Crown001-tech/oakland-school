import { supabase } from '../config/supabase.js';

async function test() {
  const tables = [
    'schools', 'students', 'staff', 'classes', 'admission_applications',
    'fees', 'fee_payments', 'timetables', 'timetable_slots', 'grades',
    'attendance', 'salaries', 'payroll', 'documents', 'inventory_items',
    'leave_requests', 'authorized_persons', 'pickup_logs'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id');
    console.log(`${t}:`, error ? `ERROR: ${error.message}` : `${data?.length ?? 0} rows`);
  }
}

test();

