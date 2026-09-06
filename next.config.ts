import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://ui-avatars.com https://img.logo.dev https://logo.clearbit.com;
  media-src 'self' blob: data:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-src 'self' https://*.supabase.co;
  frame-ancestors 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy: prevents XSS, injection and unauthorized origins
          { key: 'Content-Security-Policy', value: cspHeader },
          // Prevents MIME sniffing — complements server-side magic-byte validation
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The app itself is never framed by third-party origins
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Cross-origin privacy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Limit browser features accessible to the app
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          // Enforces HTTPS transport with 2-year max-age
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          // Legacy XSS filter protection
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Enable DNS prefetching control
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);