import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bank Accounts | Oakland Schools',
  description: 'Internal accounts redirection',
};

export default function BursarBankAccountsPage() {
  redirect('/bursar');
}
