import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Resume uploads are forwarded through Server Actions; the framework
      // caps action payloads at 1 MB by default. 6 MB leaves headroom above
      // the 5 MB resume file limit (MAX_RESUME_FILE_SIZE_BYTES).
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
