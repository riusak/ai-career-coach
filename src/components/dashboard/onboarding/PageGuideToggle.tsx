'use client';

import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PageGuideToggleProps {
  /** Current banner visibility (drives the label swap). */
  visible: boolean;
  onToggle: () => void;
}

/**
 * Discrete page-header trigger for the contextual onboarding guide —
 * « Masquer le guide » when the banner is shown, « Guide de la page » when
 * it is hidden. Styled after the template's amber pill (same family as the
 * header « Visite guidée » trigger).
 */
export default function PageGuideToggle({ visible, onToggle }: PageGuideToggleProps) {
  const t = useTranslations('guides');

  return (
    <button
      type="button"
      id="page-guide-toggle"
      onClick={onToggle}
      aria-pressed={visible}
      title={t('toggleTitle')}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs font-bold text-amber-900 shadow-2xs transition-all hover:bg-amber-100"
    >
      <Lightbulb className="h-3.5 w-3.5 text-[#FF7A00]" />
      <span>{visible ? t('hide') : t('show')}</span>
    </button>
  );
}
