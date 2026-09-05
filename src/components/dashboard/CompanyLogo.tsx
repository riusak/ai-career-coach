'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { getCompanyLogoSource } from '@/lib/company-logo';

export type CompanyLogoSize = 'sm' | 'md' | 'lg';
export type CompanyLogoShape = 'circle' | 'rounded';

const SIZE_STYLES: Record<CompanyLogoSize, { shell: string; text: string; icon: string }> = {
  sm: { shell: 'w-8 h-8', text: 'text-[10px]', icon: 'w-4 h-4' },
  md: { shell: 'w-12 h-12', text: 'text-xs', icon: 'w-5 h-5' },
  lg: { shell: 'w-14 h-14', text: 'text-sm', icon: 'w-6 h-6' },
};

const SHAPE_STYLES: Record<CompanyLogoShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
};

interface CompanyLogoProps {
  company: string;
  /**
   * 'md' (48px roadmap badges / modals) | 'sm' (32px cards) | 'lg' (56px).
   */
  size?: CompanyLogoSize;
  /** 'circle' (roadmap badges) | 'rounded' (cards / modals). */
  shape?: CompanyLogoShape;
  title?: string;
  className?: string;
}

/**
 * Chart 3 — dynamic company logo rendered on-the-fly from the Clearbit Logo
 * API (https://logo.clearbit.com/<domain>, derived from the company name).
 * Falls back to a deterministic professional initials tile when the domain is
 * unknown or the image fails to load (offline, Clearbit miss, CSP, …). No
 * image binary is ever stored in Supabase.
 */
export default function CompanyLogo({
  company,
  size = 'md',
  shape = 'circle',
  title,
  className = '',
}: CompanyLogoProps) {
  const source = useMemo(() => getCompanyLogoSource(company), [company]);
  // Records WHICH Clearbit URL failed to load. Derived-state pattern: as soon
  // as the company / derived URL changes, the previous failure no longer
  // applies and the remote image is re-attempted automatically — no effect
  // needed (avoids setState-in-effect cascading renders).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const style = SIZE_STYLES[size];
  const shapeClass = SHAPE_STYLES[shape];
  const showRemoteLogo = source.url !== null && failedUrl !== source.url;

  return (
    <div
      title={title ?? company}
      aria-label={company}
      className={`${style.shell} ${shapeClass} shrink-0 flex items-center justify-center overflow-hidden bg-white ring-4 ring-amber-100/80 border border-amber-200/60 shadow-[0_8px_20px_rgba(255,140,0,0.15)] select-none ${className}`}
    >
      {showRemoteLogo ? (
        // Plain <img> on purpose: next/image would require per-origin remote
        // allow-listing and URL rewriting; Clearbit serves small static PNGs,
        // and the onError fallback is the whole point of this component.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source.url as string}
          alt={company}
          title={title ?? company}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedUrl(source.url)}
          className="w-full h-full object-contain p-1"
        />
      ) : source.initials ? (
        <span
          style={{ backgroundColor: source.color }}
          className={`w-full h-full flex items-center justify-center ${style.text} font-black text-white tracking-tight ${shapeClass}`}
        >
          {source.initials}
        </span>
      ) : (
        <Building2 className={`${style.icon} text-[#FF7A00]`} />
      )}
    </div>
  );
}
