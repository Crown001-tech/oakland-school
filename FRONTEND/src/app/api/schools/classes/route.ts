import { NextResponse } from 'next/server';
import { getClassNames } from '@/lib/school-classes';
import { getSchoolDb } from '@/lib/school-db';

// Open to visitors, for the school of the address they came in on: the school's class names, so the admission form and every portal list the school's own classes
export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getClassNames(await getSchoolDb({ allowVisitor: true })) });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof Error ? err.message : 'Database error' }, { status: 500 });
  }
}
