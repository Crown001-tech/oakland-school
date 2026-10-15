import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Oakland Schools | Academic Excellence & School Management',
  description:
    'Flagship school management platform for Oakland Schools. Internal administration, student records, attendance tracking, and academic assessment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#f8faf9] text-slate-900 selection:bg-[#b3141f] selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
