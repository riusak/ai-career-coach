'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

interface ProfileHeaderProps {
  fullName: string;
  headline: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

/**
 * Hero header at the top of the dashboard: brand-styled banner with a sleek
 * edit overlay, overlapping circular avatar with its own edit overlay, and the
 * user's name + headline underneath. The Navy + Orange brand palette is
 * strictly enforced — no sparkles, no gold accents.
 */
export default function ProfileHeader({
  fullName,
  headline,
  avatarUrl,
  bannerUrl,
}: ProfileHeaderProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const bannerInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: 'avatar' | 'banner', file: File) {
    setError(null);
    const form = new FormData();
    form.append('file', file);
    const endpoint = kind === 'avatar' ? '/api/profile/avatar' : '/api/profile/banner';
    const response = await fetch(endpoint, { method: 'POST', body: form });
    if (!response.ok) {
      const payload: { error?: string } = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Upload failed');
      return;
    }
    startTransition(() => router.refresh());
  }

  async function remove(kind: 'avatar' | 'banner') {
    setError(null);
    const endpoint = kind === 'avatar' ? '/api/profile/avatar' : '/api/profile/banner';
    const response = await fetch(endpoint, { method: 'DELETE' });
    if (!response.ok) {
      const payload: { error?: string } = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Delete failed');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <section
      aria-label={fullName}
      className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm"
    >
      <div className="relative h-44 sm:h-56">
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        ) : (
          <DefaultBanner />
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            disabled={pending}
            aria-label={t('bannerEdit')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-navy-900/60 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-navy-900/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <EditIcon />
            {t('bannerEdit')}
          </button>
          {bannerUrl && (
            <button
              type="button"
              onClick={() => remove('banner')}
              disabled={pending}
              className="inline-flex items-center rounded-full border border-white/40 bg-navy-900/60 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-red-600/90 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t('bannerEdit')}
            >
              <TrashIcon />
            </button>
          )}
        </div>
        <input
          ref={bannerInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void upload('banner', file);
              event.target.value = '';
            }
          }}
        />
      </div>

      <div className="relative px-5 pb-5 sm:px-8 sm:pb-6">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-orange-100 to-orange-50 shadow-md">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-orange-700">
                    {getInitials(fullName)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                disabled={pending}
                aria-label={t('avatarEdit')}
                className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange text-white shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <EditIcon className="h-3.5 w-3.5" />
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void upload('avatar', file);
                    event.target.value = '';
                  }
                }}
              />
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-xl font-bold tracking-tight text-navy-900 sm:text-2xl">
                {fullName}
              </h1>
              {headline && (
                <p className="mt-0.5 truncate text-sm font-medium text-navy-600">{headline}</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function DefaultBanner() {
  // Brand-styled fallback: navy gradient + subtle orange grid + monogram FP.
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-grid-navy"
      style={{
        background:
          'linear-gradient(135deg, #101F32 0%, #1E2A3A 60%, #27374A 100%)',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 200"
        className="absolute inset-0 h-full w-full opacity-25"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="banner-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D88318" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="600" height="200" fill="url(#banner-grid)" />
        <text
          x="540"
          y="150"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="120"
          fontWeight="800"
          fill="#D88318"
          opacity="0.18"
          textAnchor="end"
        >
          FP
        </text>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent" />
    </div>
  );
}

function EditIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'AC';
  return (
    trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'AC'
  );
}