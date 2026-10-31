import { NextResponse, type NextRequest } from 'next/server';
import { solveTimetableCSP, ClassCurriculumSpec } from '@/lib/timetable-csp-solver';

export async function POST(request: NextRequest) {
  try {
    let specs: ClassCurriculumSpec[] | undefined;
    try {
      const body = await request.json();
      if (body && Array.isArray(body.specs)) {
        specs = body.specs;
      }
    } catch {
      // Body is optional
    }

    const result = solveTimetableCSP(specs);

    return NextResponse.json({
      success: true,
      message: `CSP Solver completed in ${result.executionTimeMs}ms with ${result.hardConflictsCount} hard conflicts.`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Solver error' },
      { status: 500 }
    );
  }
}
