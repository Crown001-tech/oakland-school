import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { getVerifiedRole } from '@/lib/caller';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const effectiveRole = (await getVerifiedRole(user));

    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      return NextResponse.json({ success: false, message: 'Forbidden. Only faculty can author questions.' }, { status: 403 });
    }

    const { data: staff } = await adminClient
      .from('staff_profiles')
      .select('id, school_id')
      .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
      .maybeSingle();

    let schoolId = staff?.school_id;
    if (!schoolId) {
      const { data: school } = await adminClient.from('schools').select('id').limit(1).maybeSingle();
      schoolId = school?.id;
    }

    const body = await request.json();
    const { bankId, mode } = body;

    if (!bankId) {
      return NextResponse.json({ success: false, message: 'Bank ID is required.' }, { status: 400 });
    }

    // Verify bank exists
    const { data: bank, error: bankErr } = await adminClient
      .from('cbt_question_banks')
      .select('id, questions_count')
      .eq('id', bankId)
      .single();

    if (bankErr || !bank) {
      return NextResponse.json({ success: false, message: 'Question bank not found.' }, { status: 404 });
    }

    if (mode === 'excel') {
      // Excel Bulk Upload Mode
      const { fileBase64 } = body;
      if (!fileBase64) {
        return NextResponse.json({ success: false, message: 'Excel file base64 data required.' }, { status: 400 });
      }

      const buffer = Buffer.from(fileBase64, 'base64');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.worksheets[0];

      if (!worksheet || worksheet.rowCount <= 1) {
        return NextResponse.json({ success: false, message: 'The uploaded Excel file contains no question rows.' }, { status: 400 });
      }

      const rawRows: any[] = [];
      const headers: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            headers[colNumber] = String(cell.value || '').trim();
          });
        } else {
          const rowObj: Record<string, any> = {};
          row.eachCell((cell, colNumber) => {
            const h = headers[colNumber];
            if (h) rowObj[h] = cell.value;
          });
          rawRows.push(rowObj);
        }
      });

      if (rawRows.length === 0) {
        return NextResponse.json({ success: false, message: 'The uploaded Excel file contains no question rows.' }, { status: 400 });
      }

      const parsedQuestions: any[] = [];
      const errors: string[] = [];

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        const qTypeRaw = String(row['Question Type'] || 'mcq').toLowerCase().trim();
        const qText = String(row['Question Text'] || '').trim();
        const correctAns = String(row['Correct Answer'] || '').trim();
        const marks = Number(row['Marks']) || 1;
        const explanation = String(row['Explanation'] || '').trim();

        if (!qText) {
          errors.push(`Row ${rowNum}: Question text is missing.`);
          return;
        }
        if (!correctAns) {
          errors.push(`Row ${rowNum}: Correct answer is missing.`);
          return;
        }

        let questionType: 'mcq' | 'true_false' | 'short_answer' = 'mcq';
        let options: any[] = [];

        if (qTypeRaw === 'true_false' || qTypeRaw === 'tf' || qTypeRaw === 'true/false') {
          questionType = 'true_false';
          options = [
            { key: 'A', text: 'True' },
            { key: 'B', text: 'False' },
          ];
        } else if (qTypeRaw === 'short_answer' || qTypeRaw === 'theory') {
          questionType = 'short_answer';
          options = [];
        } else {
          questionType = 'mcq';
          const optA = String(row['Option A'] || '').trim();
          const optB = String(row['Option B'] || '').trim();
          const optC = String(row['Option C'] || '').trim();
          const optD = String(row['Option D'] || '').trim();

          if (!optA || !optB) {
            errors.push(`Row ${rowNum}: Multiple choice questions must provide at least Option A and Option B.`);
            return;
          }

          options = [
            { key: 'A', text: optA },
            { key: 'B', text: optB },
            ...(optC ? [{ key: 'C', text: optC }] : []),
            ...(optD ? [{ key: 'D', text: optD }] : []),
          ];
        }

        parsedQuestions.push({
          bank_id: bankId,
          school_id: schoolId,
          question_text: qText,
          question_type: questionType,
          options,
          correct_answer: correctAns,
          explanation: explanation || null,
          marks,
          difficulty: 'medium',
          created_by: staff?.id || null,
        });
      });

      if (parsedQuestions.length === 0) {
        return NextResponse.json(
          { success: false, message: 'No valid questions could be extracted.', errors },
          { status: 400 }
        );
      }

      const { data: inserted, error: insertErr } = await adminClient
        .from('cbt_questions')
        .insert(parsedQuestions)
        .select();

      if (insertErr) throw insertErr;

      // Update question bank count
      const newCount = (bank.questions_count || 0) + parsedQuestions.length;
      await adminClient
        .from('cbt_question_banks')
        .update({ questions_count: newCount })
        .eq('id', bankId);

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${parsedQuestions.length} questions from Excel.`,
        importedCount: parsedQuestions.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Mode: Manual Single Question
    const { questionText, questionType, options, correctAnswer, marks, explanation, difficulty } = body;

    if (!questionText?.trim() || !correctAnswer) {
      return NextResponse.json(
        { success: false, message: 'Question text and correct answer are required.' },
        { status: 400 }
      );
    }

    const newQuestion = {
      bank_id: bankId,
      school_id: schoolId,
      question_text: questionText.trim(),
      question_type: questionType || 'mcq',
      options: Array.isArray(options) ? options : [],
      correct_answer: String(correctAnswer).trim(),
      marks: Number(marks) || 1,
      explanation: explanation?.trim() || null,
      difficulty: difficulty || 'medium',
      created_by: staff?.id || null,
    };

    const { data: inserted, error: insertErr } = await adminClient
      .from('cbt_questions')
      .insert(newQuestion)
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Increment question count
    await adminClient
      .from('cbt_question_banks')
      .update({ questions_count: (bank.questions_count || 0) + 1 })
      .eq('id', bankId);

    return NextResponse.json({
      success: true,
      message: 'Question added successfully',
      data: inserted,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Failed to process question' }, { status: 500 });
  }
}
