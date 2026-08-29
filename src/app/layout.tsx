import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Career Coach',
  description: 'AI Career Coach Application',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
