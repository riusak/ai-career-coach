import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Development access from the LAN (e.g. http://192.168.0.23:3000 from a
  // phone/second machine): Next.js blocks cross-origin requests to dev-only
  // assets (/_next/static chunks, /_next/hmr) by default. Without this entry
  // the browser loads the HTML but NO JavaScript — client components never
  // hydrate, so e.g. the login form submits natively (GET with credentials
  // in the URL) and every client-side handler silently stops working.
  allowedDevOrigins: ['192.168.0.23'],
  experimental: {
    serverActions: {
      // Resume uploads are forwarded through Server Actions; the framework
      // caps action payloads at 1 MB by default. 6 MB leaves headroom above
      // the 5 MB resume file limit (MAX_RESUME_FILE_SIZE_BYTES).
      bodySizeLimit: '6mb',
    },
  },
};

export default withNextIntl(nextConfig);