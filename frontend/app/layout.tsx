import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit',
  description: 'AI Interview Prep Kit application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
