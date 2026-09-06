'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  HelpCircle,
  Inbox,
  Lightbulb,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Video,
  X,
} from 'lucide-react';
import { updateFeedbackStatusAction } from '@/lib/feedback/actions';
import type {
  AdminFeedbackListResult,
  FeedbackCategory,
  FeedbackStatus,
  UserFeedback,
} from '@/types/feedback';

interface AdminFeedbackViewProps {
  initialData: AdminFeedbackListResult | null;
  summaryStats: {
    totalCount: number;
    newCount: number;
    inProgressCount: number;
    resolvedCount: number;
    averageRating: number | null;
  };
  currentStatus: string;
  currentCategory: string;
  currentQuery: string;
}

const CATEGORY_LABELS: Record<FeedbackCategory, { label: string; icon: typeof MessageSquare; color: string }> = {
  general: { label: 'Avis général', icon: MessageSquare, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  bug: { label: 'Bug signalé', icon: Bug, color: 'bg-red-50 text-red-700 border-red-200' },
  feature: { label: 'Suggestion', icon: Lightbulb, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  interview: { label: 'Entretien', icon: Video, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  cv_ats: { label: 'CV & ATS', icon: FileText, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  pricing: { label: 'Tarification', icon: Sparkles, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  other: { label: 'Autre', icon: HelpCircle, color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const STATUS_LABELS: Record<FeedbackStatus, { label: string; color: string; badge: string }> = {
  new: { label: 'Nouveau', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-500' },
  in_progress: { label: 'En cours', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'bg-blue-500' },
  resolved: { label: 'Résolu', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500' },
  archived: { label: 'Archivé', color: 'text-slate-600 bg-slate-100 border-slate-200', badge: 'bg-slate-400' },
};

export default function AdminFeedbackView({
  initialData,
  summaryStats,
  currentStatus,
  currentCategory,
  currentQuery,
}: AdminFeedbackViewProps) {
  const router = useRouter();
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [modalStatus, setModalStatus] = useState<FeedbackStatus>('new');
  const [modalNotes, setModalNotes] = useState('');
  const [isUpdating, startUpdate] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [search, setSearch] = useState(currentQuery);

  const handleOpenModal = (item: UserFeedback) => {
    setSelectedFeedback(item);
    setModalStatus(item.status);
    setModalNotes(item.adminNotes ?? '');
    setUpdateError(null);
  };

  const handleCloseModal = () => {
    setSelectedFeedback(null);
    setUpdateError(null);
  };

  const handleSaveStatus = () => {
    if (!selectedFeedback) return;
    setUpdateError(null);

    startUpdate(async () => {
      const res = await updateFeedbackStatusAction(selectedFeedback.id, modalStatus, modalNotes);
      if (res.success) {
        handleCloseModal();
        router.refresh();
      } else {
        setUpdateError(res.error ?? 'Erreur lors de la mise à jour.');
      }
    });
  };

  const handleFilterChange = (key: 'status' | 'category' | 'query', value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/admin/feedback?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('query', search);
  };

  const items = initialData?.items ?? [];
  const total = initialData?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-[#FF7A00]" />
            <span>Retours Utilisateurs & Support</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez les suggestions, signalements de bugs et avis envoyés par les candidats ({total} au total).
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total reçus</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{summaryStats.totalCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Nouveaux
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">{summaryStats.newCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">En cours</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{summaryStats.inProgressCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Résolus</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{summaryStats.resolvedCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Note moyenne
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summaryStats.averageRating !== null ? `${summaryStats.averageRating} / 5` : '—'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par mot-clé dans le sujet..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtres :</span>
          </div>

          {/* Status selector */}
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20"
          >
            <option value="all">Tous les statuts</option>
            <option value="new">Nouveaux</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="archived">Archivés</option>
          </select>

          {/* Category selector */}
          <select
            value={currentCategory}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20"
          >
            <option value="all">Toutes les catégories</option>
            <option value="bug">Bugs</option>
            <option value="feature">Suggestions</option>
            <option value="interview">Simulations</option>
            <option value="cv_ats">CV & ATS</option>
            <option value="general">Avis général</option>
            <option value="other">Autres</option>
          </select>
        </div>
      </div>

      {/* Feedback items list */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Aucun retour trouvé</p>
            <p className="text-xs text-slate-500 max-w-sm">
              Aucun message ne correspond aux critères ou aucun utilisateur n&apos;a encore envoyé de retour dans cette section.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const catInfo = CATEGORY_LABELS[item.category] ?? CATEGORY_LABELS.general;
            const statusInfo = STATUS_LABELS[item.status] ?? STATUS_LABELS.new;
            const CatIcon = catInfo.icon;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.badge}`} />
                      {statusInfo.label}
                    </span>

                    {/* Category pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catInfo.color}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      {catInfo.label}
                    </span>

                    {/* Rating stars if provided */}
                    {item.rating && (
                      <div className="inline-flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: item.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    )}

                    {/* Date */}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Subject & User */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">{item.subject}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                    <span>
                      Par : <strong className="text-slate-800">{item.userName || item.userEmail || 'Anonyme'}</strong>
                    </span>
                    {item.pageUrl && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-slate-400 truncate max-w-xs">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {item.pageUrl}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(item)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Examiner & Traiter
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail & Status Modal */}
      {selectedFeedback && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0B1528] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-[#FF7A00]" />
                <span className="text-sm font-bold text-white">Détail du message utilisateur</span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* User meta box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {selectedFeedback.userName || 'Sans nom'}
                  </span>
                  <span className="text-slate-500">{selectedFeedback.userEmail}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <span>Reçu le : {new Date(selectedFeedback.createdAt).toLocaleString('fr-FR')}</span>
                  {selectedFeedback.pageUrl && (
                    <span className="text-slate-400">Page : {selectedFeedback.pageUrl}</span>
                  )}
                </div>
              </div>

              {/* Subject & message */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sujet</h4>
                <p className="text-sm font-bold text-slate-900 p-3 bg-white border border-slate-200 rounded-xl">
                  {selectedFeedback.subject}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Message</h4>
                <div className="text-xs text-slate-800 p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedFeedback.message}
                </div>
              </div>

              {/* Update Status & Notes */}
              <div className="pt-2 border-t border-slate-200 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Statut du retour</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['new', 'in_progress', 'resolved', 'archived'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setModalStatus(st)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          modalStatus === st
                            ? 'bg-[#FF7A00] text-white border-[#FF7A00] shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[st].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Notes administratives internes
                  </label>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Ajoutez une remarque ou les actions prises pour cette demande..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] resize-none"
                  />
                </div>
              </div>

              {updateError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{updateError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl bg-[#0B1528] hover:bg-[#132238] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
