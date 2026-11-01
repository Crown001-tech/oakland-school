import type { Metadata } from 'next';
import { Inter, Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';
import { PRODUCT_NAME, getBrandId, isEductiveBrand } from '@/lib/brand';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { isLocalReviewFlagOn } from '@/lib/local-review';
import { FloatingDemoSwitcher } from '@/components/demo/FloatingDemoSwitcher';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Eductive's headline and body typefaces (used only when the Eductive brand is active)
const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = isEductiveBrand()
  ? {
      title: `${PRODUCT_NAME} | School Management`,
      description: `${PRODUCT_NAME} demo school: admissions, scores, fees and gate pickup for Nigerian schools.`,
    }
  : {
      title: 'Oakland Schools | Academic Excellence & School Management',
      description:
        'Flagship school management platform for Oakland Schools. Internal administration, student records, attendance tracking, and academic assessment.',
    };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isEductive = isEductiveBrand();
  const isDemo = isDemoModeEnabled();
  const showSwitcher = isDemo || isLocalReviewFlagOn();
  const fontClasses = isEductive
    ? `${inter.variable} ${displayFont.variable} ${bodyFont.variable}`
    : inter.variable;

  return (
    <html lang="en" data-brand={getBrandId()} className={`${fontClasses} h-full antialiased`} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`min-h-full flex flex-col bg-[var(--background)] text-slate-900 selection:bg-brand-accent selection:text-white ${
          showSwitcher ? 'pb-14 sm:pb-0' : ''
        }`}
      >
        {showSwitcher && <FloatingDemoSwitcher live={!isDemo} />}
        {children}
      </body>
    </html>
  );
}
