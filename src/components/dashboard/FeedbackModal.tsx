'use client';

import { useState, useTransition, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
  Video,
  X,
} from 'lucide-react';
import { submitFeedback } from '@/lib/feedback/actions';
import type { FeedbackCategory } from '@/types/feedback';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: FeedbackCategory;
}

const CATEGORIES: Array<{
  id: FeedbackCategory;
  labelFr: string;
  labelEn: string;
  icon: typeof MessageSquare;
}> = [
  { id: 'general', labelFr: 'Avis général', labelEn: 'General feedback', icon: MessageSquare },
  { id: 'bug', labelFr: 'Signaler un bug', labelEn: 'Report a bug', icon: Bug },
  { id: 'feature', labelFr: 'Idée / Amélioration', labelEn: 'Feature request', icon: Lightbulb },
  { id: 'interview', labelFr: 'Simulation d’entretien', labelEn: 'Interview simulation', icon: Video },
  { id: 'cv_ats', labelFr: 'Analyse CV & ATS', labelEn: 'CV & ATS analysis', icon: FileText },
  { id: 'other', labelFr: 'Autre question', labelEn: 'Other question', icon: HelpCircle },
];

function FeedbackModalContent({
  onClose,
  defaultCategory = 'general',
}: {
  onClose: () => void;
  defaultCategory?: FeedbackCategory;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const isFrench = locale !== 'en';

  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subject.trim().length < 3) {
      setError(
        isFrench
          ? 'Le sujet doit comporter au moins 3 caractères.'
          : 'Subject must be at least 3 characters long.'
      );
      return;
    }

    if (message.trim().length < 10) {
      setError(
        isFrench
          ? 'Le message doit comporter au moins 10 caractères.'
          : 'Message must be at least 10 characters long.'
      );
      return;
    }

    startTransition(async () => {
      const res = await submitFeedback({
        category,
        rating,
        subject,
        message,
        pageUrl: pathname,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.error ?? (isFrench ? 'Une erreur est survenue.' : 'An error occurred.'));
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Navy accent and warm orange highlights */}
        <div className="bg-[#0B1528] px-6 py-5 flex items-center justify-between text-white relative overflow-hidden">
          <div className="pointer-events-none absolute -right-6 -top-6 w-32 h-32 rounded-full bg-[#FF7A00]/20 blur-2xl" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#FF7A00] shrink-0 border border-white/10">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isFrench ? 'Votre avis & Support ForPro' : 'Feedback & Support'}
              </h2>
              <p className="text-xs text-slate-300 font-normal">
                {isFrench
                  ? 'Aidez-nous à rendre ForPro AI encore plus puissant pour vous.'
                  : 'Help us make ForPro AI even more powerful for you.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isFrench ? 'Fermer la boîte de dialogue' : 'Close dialog'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isSuccess ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  {isFrench ? 'Merci beaucoup pour votre retour !' : 'Thank you for your feedback!'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isFrench
                    ? 'Chaque message est lu attentivement par notre équipe pour perfectionner continuellement l’application.'
                    : 'Every submission is carefully reviewed by our team to continuously improve the platform.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-6 py-2.5 rounded-xl bg-[#0B1528] text-white text-xs font-bold hover:bg-[#132238] transition-colors shadow-sm cursor-pointer"
              >
                {isFrench ? 'Fermer' : 'Close'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {isFrench ? 'Catégorie du message' : 'Category'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FF7A00]/10 border-[#FF7A00] text-[#FF7A00] shadow-xs ring-1 ring-[#FF7A00]/30'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#FF7A00]' : 'text-slate-400'}`} />
                        <span className="truncate">{isFrench ? cat.labelFr : cat.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Star Rating (optional) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    {isFrench ? 'Votre note d’expérience (optionnel)' : 'Experience rating (optional)'}
                  </label>
                  {rating && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                    >
                      {isFrench ? 'Effacer' : 'Clear'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating ?? rating ?? 0) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 text-slate-300 hover:scale-110 transition-transform cursor-pointer"
                        aria-label={`${star} star`}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 hover:text-amber-200'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs font-semibold text-slate-500 ml-2">
                    {rating
                      ? isFrench
                        ? `${rating} / 5`
                        : `${rating} / 5`
                      : isFrench
                      ? 'Aucune note'
                      : 'Not rated'}
                  </span>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="feedback-subject" className="text-xs font-bold text-slate-700">
                    {isFrench ? 'Sujet du message' : 'Subject'}
                  </label>
                  <span className="text-[10px] text-slate-400">{subject.length}/150</span>
                </div>
                <input
                  id="feedback-subject"
                  type="text"
                  required
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    isFrench
                      ? 'Ex: Suggestion pour le simulateur vocal...'
                      : 'Ex: Suggestion for the speech simulator...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="feedback-message" className="text-xs font-bold text-slate-700">
                    {isFrench ? 'Votre message détaillé' : 'Detailed message'}
                  </label>
                  <span className="text-[10px] text-slate-400">{message.length}/3000</span>
                </div>
                <textarea
                  id="feedback-message"
                  required
                  rows={4}
                  maxLength={3000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isFrench
                      ? 'Partagez vos impressions, le problème rencontré ou vos souhaits pour les prochaines versions...'
                      : 'Share your thoughts, issues encountered, or wishes for future versions...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] resize-none leading-relaxed"
                />
              </div>

              {/* Error banner */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isFrench ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isFrench ? 'Envoi en cours...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isFrench ? 'Envoyer le message' : 'Send message'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>
            {isFrench
              ? 'Plateforme sécurisée & écoute active : vos retours construisent ForPro AI.'
              : 'Secure platform & active feedback: your suggestions build ForPro AI.'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackModal({
  isOpen,
  onClose,
  defaultCategory = 'general',
}: FeedbackModalProps) {
  if (!isOpen) return null;
  return <FeedbackModalContent onClose={onClose} defaultCategory={defaultCategory} />;
}
