import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Listly AI | Evidence before eloquence',
  description:
    'Real-estate marketing grounded in property data and agent-verified photo features.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
