import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'MediKiosk — AI Clinical History Intake & Triage Platform',
  description:
    'MediKiosk captures a complete structured clinical history via AI conversation and document digitization before the patient enters the consultation room.',
  openGraph: {
    title: 'MediKiosk — AI Clinical History Intake & Triage Platform',
    description:
      'Captures complete 7-section clinical history via AI before consultation.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
