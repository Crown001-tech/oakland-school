import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CBT Examinations | Oakland Schools',
  description: 'CBT module redirected',
};

export default function AdminCbtPage() {
  redirect('/admin');
}
