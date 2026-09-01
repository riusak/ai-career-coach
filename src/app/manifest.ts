import type { MetadataRoute } from 'next';

/**
 * PWA/Web App manifest for ForPro AI.
 * Served at /manifest.webmanifest by the Next.js App Router.
 * Icons reference the official brand assets copied to public/branding/.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ForPro AI',
    short_name: 'ForPro AI',
    description:
      'Coach de carrière assisté par IA : analyse de CV, matching d’offres et simulations d’entretien.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F8FB',
    theme_color: '#101F32',
    icons: [
      {
        src: '/branding/logo-primary-light.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/branding/logo-contracted-light.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
