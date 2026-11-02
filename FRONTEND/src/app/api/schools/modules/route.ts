import { NextResponse } from 'next/server';
import { readModuleSettings } from '@/lib/modules';
import { getSchoolDb } from '@/lib/school-db';

// Open to visitors, for the school of the address they came in on, and harmless: which optional modules the school has switched off. Menus and the middleware read it.
export async function GET() {
  try {
    const { data: school } = await (await getSchoolDb({ allowVisitor: true })).from('schools').select('settings').limit(1).maybeSingle();
    return NextResponse.json({ success: true, data: readModuleSettings(school?.settings) });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Database error' }, { status: 500 });
  }
}
