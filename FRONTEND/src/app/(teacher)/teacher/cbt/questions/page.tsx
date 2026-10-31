import { redirect } from 'next/navigation';

export default function TeacherQuestionsRedirect() {
  redirect('/teacher/cbt?tab=banks');
}
