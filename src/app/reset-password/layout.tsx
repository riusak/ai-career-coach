/**
 * Force dynamic rendering for /reset-password so the NextIntlClientProvider
 * from the root layout is mounted before Client Components call
 * useTranslations — prevents the ENVIRONMENT_FALLBACK error during build.
 */
export const dynamic = 'force-dynamic';

export default function ResetPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
