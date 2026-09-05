import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  Plus,
  Star,
  Sparkles,
  Briefcase,
  Video,
  Download,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  MoreVertical,
  Layers,
  Database,
  Eye,
  Lightbulb
} from 'lucide-react';
import { CVDocument } from '../types';
import { CVPreviewModal } from './CVPreviewModal';
import { MenuOnboardingGuide } from './MenuOnboardingGuide';

interface MyCVsViewProps {
  cvs: CVDocument[];
  onBackToDashboard: () => void;
  onUploadCV: (file: File) => void;
  onSetPrimaryCV: (cvId: string) => void;
  onDeleteCV: (cvId: string) => void;
  onAnalyzeCV: (cv: CVDocument) => void;
  onMatchJobs: (cv: CVDocument) => void;
  onMockInterview: (cv: CVDocument) => void;
  lang: 'en' | 'fr';
}

export const MyCVsView: React.FC<MyCVsViewProps> = ({
  cvs,
  onBackToDashboard,
  onUploadCV,
  onSetPrimaryCV,
  onDeleteCV,
  onAnalyzeCV,
  onMatchJobs,
  onMockInterview,
  lang,
}) => {
  const isFrench = lang === 'fr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'primary' | 'high-score'>('all');
  const [selectedCVForPreview, setSelectedCVForPreview] = useState<CVDocument | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Filtered CVs list
  const filteredCVs = cvs.filter((cv) => {
    const matchesSearch =
      cv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cv.roleTarget && cv.roleTarget.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'primary') return cv.isPrimary;
    if (filterType === 'high-score') return cv.score >= 80;
    return true;
  });

  const primaryCV = cvs.find((c) => c.isPrimary) || cvs[0];
  const avgScore = cvs.length > 0 ? Math.round(cvs.reduce((acc, c) => acc + c.score, 0) / cvs.length) : 0;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadCV(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadCV(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="my-cvs-view" className="flex-1 flex flex-col gap-6 sm:gap-8 pb-16 animate-in fade-in duration-200">
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            id="cvs-back-to-dashboard-btn"
            onClick={onBackToDashboard}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isFrench ? 'Retour au Dashboard' : 'Back to Dashboard'}</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{isFrench ? 'Mes CVs Professionnels' : 'My CVs'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF7A00] font-bold border border-orange-200">
                {cvs.length} {isFrench ? 'documents stockés' : 'documents stored'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {isFrench
                ? 'Gérez vos CVs stockés dans la base de données, définissez le document principal et lancez les diagnostics ATS.'
                : 'Manage persistent CVs, establish your primary baseline, run ATS diagnostics, and match jobs.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            id="my-cvs-guide-btn"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50/90 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={isFrench ? 'Afficher ou masquer le guide de prise en main' : 'Toggle page guide'}
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{showGuide ? (isFrench ? 'Masquer guide' : 'Hide guide') : (isFrench ? '💡 Guide de la page' : '💡 Page Guide')}</span>
          </button>

          <button
            id="upload-new-cv-btn"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white font-bold text-xs sm:text-sm shadow-[0_4px_14px_rgba(255,122,0,0.28)] transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isFrench ? 'Uploader un nouveau CV' : 'Upload New CV'}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Contextual Onboarding Guide */}
      {showGuide && (
        <MenuOnboardingGuide
          menu="cvs"
          lang={lang}
          onDismiss={() => setShowGuide(false)}
          onStartGlobalTour={onBackToDashboard}
        />
      )}

      {/* Top 4 Executive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total CVs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                {isFrench ? 'Total des CVs' : 'Total CVs'}
              </span>
              <span className="text-xl font-black text-slate-900">
                {cvs.length} {isFrench ? 'Fichiers' : 'Files'}
              </span>
            </div>
          </div>
        </div>

        {/* Stat 2: Primary CV */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Star className="w-5 h-5 fill-emerald-600 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-400 block truncate">
                {isFrench ? 'CV Principal Défini' : 'Primary CV'}
              </span>
              <span className="text-sm font-bold text-slate-900 truncate block">
                {primaryCV ? primaryCV.name : (isFrench ? 'Aucun défini' : 'None set')}
              </span>
            </div>
          </div>
        </div>

        {/* Stat 3: Average ATS Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                {isFrench ? 'Score ATS Moyen' : 'Average ATS Score'}
              </span>
              <span className="text-xl font-black text-slate-900">
                {avgScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Stat 4: Database Storage Health */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 block">
                {isFrench ? 'Stockage Base de Données' : 'Database Storage'}
              </span>
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isFrench ? 'Persistant & Sécurisé' : 'Persistent & Synced'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Quick Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-[#FF7A00] bg-orange-50/50 scale-[1.01]'
            : 'border-slate-200/90 hover:border-amber-300 bg-white hover:bg-slate-50/50'
        }`}
      >
        <div className="max-w-md mx-auto flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF7A00] flex items-center justify-center shadow-xs">
            <UploadCloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {isFrench
                ? 'Glissez-déposez votre CV ici, ou cliquez pour parcourir'
                : 'Drag & drop your resume file here, or click to browse'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isFrench
                ? 'Formats acceptés : PDF, DOCX (Taille max 10 Mo). Le CV est automatiquement persisté dans votre base de données.'
                : 'Supported formats: PDF, DOCX (Max 10 MB). Stored securely into your local database.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isFrench ? 'Rechercher un CV par nom ou rôle...' : 'Search CV by file name or role...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF7A00] shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isFrench ? 'Tous les CVs' : 'All CVs'} ({cvs.length})
          </button>
          <button
            onClick={() => setFilterType('primary')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterType === 'primary'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isFrench ? 'Principal Uniquement' : 'Primary Only'}
          </button>
          <button
            onClick={() => setFilterType('high-score')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterType === 'high-score'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isFrench ? 'Score ATS ≥ 80%' : 'ATS Score ≥ 80%'}
          </button>
        </div>
      </div>

      {/* Main CV Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCVs.map((cv) => {
          const isPrimary = cv.isPrimary;
          const isHighScore = cv.score >= 80;

          return (
            <div
              key={cv.id}
              id={`cv-card-${cv.id}`}
              className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between group hover:shadow-lg relative overflow-hidden ${
                isPrimary
                  ? 'border-emerald-300 ring-2 ring-emerald-100 bg-linear-to-b from-white to-emerald-50/15'
                  : 'border-slate-200/90 hover:border-amber-300'
              }`}
            >
              {/* Top Card Row */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        isPrimary
                          ? 'bg-emerald-500 text-white'
                          : 'bg-orange-500/10 text-[#FF7A00] border border-orange-500/20'
                      }`}
                    >
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3
                        onClick={() => setSelectedCVForPreview(cv)}
                        className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#FF7A00] transition-colors line-clamp-1 cursor-pointer"
                        title={cv.name}
                      >
                        {cv.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {cv.roleTarget || 'Senior Software Engineer'}
                      </p>
                    </div>
                  </div>

                  {/* Primary Toggle Action */}
                  <button
                    onClick={() => onSetPrimaryCV(cv.id)}
                    title={isPrimary ? (isFrench ? 'CV Principal Actif' : 'Active Primary CV') : (isFrench ? 'Définir comme CV Principal' : 'Set as Primary')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isPrimary
                        ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                        : 'bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isPrimary ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                  </button>
                </div>

                {/* Badges row: Primary tag, Target role, Version */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {isPrimary && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-emerald-700" />
                      {isFrench ? 'CV Principal' : 'Primary'}
                    </span>
                  )}
                  {cv.version && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                      {cv.version}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">
                    {cv.size}
                  </span>
                </div>

                {/* Score Gauge Row */}
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                        isHighScore
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cv.score}%
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {isFrench ? 'Score ATS Global' : 'Overall ATS Score'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isHighScore
                          ? (isFrench ? 'Optimisé pour le recrutement' : 'Optimized for hiring')
                          : (isFrench ? 'Améliorations recommandées' : 'Improvements suggested')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCVForPreview(cv);
                    }}
                    className="text-xs font-bold text-[#FF7A00] hover:text-[#E66E00] flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{isFrench ? 'Détails' : 'Details'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedCVForPreview(cv)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isFrench ? 'Aperçu Document' : 'Preview Document'}</span>
                </button>

                <button
                  onClick={() => onMatchJobs(cv)}
                  className="py-2 px-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={isFrench ? 'Faire un matching d’emplois avec ce CV' : 'Match jobs with this CV'}
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">{isFrench ? 'Matching' : 'Match'}</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm(isFrench ? `Supprimer "${cv.name}" ?` : `Delete "${cv.name}"?`)) {
                      onDeleteCV(cv.id);
                    }
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title={isFrench ? 'Supprimer ce CV' : 'Delete CV'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredCVs.length === 0 && (
        <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center max-w-md mx-auto my-8 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF7A00] flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-base mb-1">
            {isFrench ? 'Aucun CV trouvé' : 'No CVs found'}
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            {isFrench
              ? 'Aucun document ne correspond à vos filtres actuels. Uploadez un nouveau CV pour commencer.'
              : 'No documents match your active filters. Upload a new resume to get started.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            {isFrench ? 'Uploader un CV' : 'Upload a CV'}
          </button>
        </div>
      )}

      {/* Interactive CV Preview & Services Modal */}
      {selectedCVForPreview && (
        <CVPreviewModal
          cv={selectedCVForPreview}
          isOpen={!!selectedCVForPreview}
          onClose={() => setSelectedCVForPreview(null)}
          onSetPrimary={(id) => {
            onSetPrimaryCV(id);
            // Update modal state
            setSelectedCVForPreview((prev) => (prev ? { ...prev, isPrimary: true } : null));
          }}
          onAnalyze={(c) => onAnalyzeCV(c)}
          onMatchJobs={(c) => {
            setSelectedCVForPreview(null);
            onMatchJobs(c);
          }}
          onMockInterview={(c) => {
            setSelectedCVForPreview(null);
            onMockInterview(c);
          }}
          onDelete={(id) => {
            onDeleteCV(id);
            setSelectedCVForPreview(null);
          }}
          lang={lang}
        />
      )}
    </div>
  );
};
