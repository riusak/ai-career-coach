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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevents MIME sniffing — complements the server-side magic-byte
          // upload validation (an uploaded file served from Storage is out of
          // scope here, but app responses are covered).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The app itself is never legitimately framed (the resume preview
          // iframe points at Supabase, whose own headers govern that frame).
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Ignored over plain HTTP (local dev), enforced on HTTPS deployments.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
    // NOTE: a strict Content-Security-Policy (nonces for Next inline scripts,
    // allow-lists for the Supabase/Gemini origins) is a deliberate follow-up —
    // enabling it blindly breaks hydration.
  },
};

export default withNextIntl(nextConfig);