import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Take CBT Examination | Oakland Schools',
  description: 'CBT examination redirected',
};

export default function TakeCbtExamPage() {
  redirect('/admin');
}
