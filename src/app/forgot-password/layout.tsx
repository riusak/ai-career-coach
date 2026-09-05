/**
 * Force dynamic rendering for /forgot-password so the NextIntlClientProvider
 * from the root layout is mounted before Client Components call
 * useTranslations — prevents the ENVIRONMENT_FALLBACK error during build.
 */
export const dynamic = 'force-dynamic';

export default function ForgotPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
