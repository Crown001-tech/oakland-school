import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Questions');

    worksheet.columns = [
      { header: 'Question Type', key: 'questionType', width: 15 },
      { header: 'Question Text', key: 'questionText', width: 45 },
      { header: 'Option A', key: 'optionA', width: 20 },
      { header: 'Option B', key: 'optionB', width: 20 },
      { header: 'Option C', key: 'optionC', width: 20 },
      { header: 'Option D', key: 'optionD', width: 20 },
      { header: 'Correct Answer', key: 'correctAnswer', width: 16 },
      { header: 'Marks', key: 'marks', width: 10 },
      { header: 'Explanation', key: 'explanation', width: 35 },
      { header: 'Topic', key: 'topic', width: 18 },
    ];

    worksheet.addRow({
      questionType: 'mcq',
      questionText: 'What is the sum of angles in a triangle?',
      optionA: '90 degrees',
      optionB: '180 degrees',
      optionC: '270 degrees',
      optionD: '360 degrees',
      correctAnswer: 'B',
      marks: 2,
      explanation: 'The interior angles of any triangle in Euclidean geometry sum to 180 degrees.',
      topic: 'Geometry',
    });

    worksheet.addRow({
      questionType: 'mcq',
      questionText: 'Which of the following is a prime number?',
      optionA: '4',
      optionB: '6',
      optionC: '7',
      optionD: '9',
      correctAnswer: 'C',
      marks: 2,
      explanation: '7 has exactly two distinct positive divisors: 1 and itself.',
      topic: 'Number Theory',
    });

    worksheet.addRow({
      questionType: 'true_false',
      questionText: 'Matter can neither be created nor destroyed in a chemical reaction.',
      optionA: 'True',
      optionB: 'False',
      optionC: '',
      optionD: '',
      correctAnswer: 'True',
      marks: 1,
      explanation: 'Law of conservation of mass.',
      topic: 'Chemistry',
    });

    worksheet.addRow({
      questionType: 'short_answer',
      questionText: 'State the SI unit of electric current.',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'Ampere',
      marks: 2,
      explanation: 'Electric current is measured in Amperes (A).',
      topic: 'Physics',
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="cbt_template.xlsx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to generate template' },
      { status: 500 }
    );
  }
}
