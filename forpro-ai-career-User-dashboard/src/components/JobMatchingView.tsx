import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  Briefcase,
  Layers,
  ChevronRight,
  Clock,
  Trash2,
  Eye,
  Video,
  FileCode,
  FileType,
  Lightbulb
} from 'lucide-react';
import { CVDocument, JobOfferMatch } from '../types';
import {
  getStoredMatches,
  addStoredMatch,
  deleteStoredMatch,
  evaluateCVWithJobOffer
} from '../utils/matchingStorage';
import { MenuOnboardingGuide } from './MenuOnboardingGuide';

interface JobMatchingViewProps {
  cvs: CVDocument[];
  onBackToDashboard: () => void;
  onMockInterviewForJob: (match: JobOfferMatch) => void;
  onViewCV?: (cv: CVDocument) => void;
  lang?: 'en' | 'fr';
}

export const JobMatchingView: React.FC<JobMatchingViewProps> = ({
  cvs,
  onBackToDashboard,
  onMockInterviewForJob,
  onViewCV,
  lang = 'fr',
}) => {
  // Currently selected CV to match
  const [selectedCvId, setSelectedCvId] = useState<string>(
    cvs.find((c) => c.isPrimary)?.id || (cvs.length > 0 ? cvs[0].id : '')
  );

  // Offer input modes
  const [offerSource, setOfferSource] = useState<'file' | 'url' | 'text'>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [offerUrl, setOfferUrl] = useState<string>('');
  const [offerText, setOfferText] = useState<string>('');
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [customCompany, setCustomCompany] = useState<string>('');

  // Evaluation states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [currentMatch, setCurrentMatch] = useState<JobOfferMatch | null>(null);
  const [matchesHistory, setMatchesHistory] = useState<JobOfferMatch[]>(getStoredMatches());

  // Drag & drop file states
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const selectedCV = cvs.find((c) => c.id === selectedCvId) || cvs[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      if (!customJobTitle) {
        // Infer title from file name
        const inferred = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setCustomJobTitle(inferred);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      if (!customJobTitle) {
        setCustomJobTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleRunEvaluation = () => {
    if (!selectedCV) return;

    setIsAnalyzing(true);
    setAnalysisStep('Extraction des compétences et prérequis de l\'offre...');

    setTimeout(() => {
      setAnalysisStep('Recoupement sémantique avec votre CV et scoring ATS...');
    }, 700);

    setTimeout(() => {
      setAnalysisStep('Détection des forces, lacunes et recommandations ciblées...');
    }, 1400);

    setTimeout(() => {
      const result = evaluateCVWithJobOffer(selectedCV, {
        source: offerSource,
        fileName: uploadedFile?.name || (offerSource === 'file' ? 'Offre_Recrutement.pdf' : undefined),
        url: offerUrl || undefined,
        text: offerText || undefined,
        customTitle: customJobTitle || undefined,
        customCompany: customCompany || undefined,
      });

      const updated = addStoredMatch(result);
      setMatchesHistory(updated);
      setCurrentMatch(result);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleDeleteHistoryMatch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = deleteStoredMatch(id);
    setMatchesHistory(updated);
    if (currentMatch?.id === id) {
      setCurrentMatch(null);
    }
  };

  const isFormValid = () => {
    if (!selectedCV) return false;
    if (offerSource === 'file') return !!uploadedFile || customJobTitle.trim().length > 0;
    if (offerSource === 'url') return offerUrl.trim().length > 5;
    if (offerSource === 'text') return offerText.trim().length > 20;
    return false;
  };

  return (
    <div id="job-matching-view" className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF7A00]">
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'fr' ? 'Job Matching & Évaluation d\'Offre' : 'Job Matching & Offer Evaluation'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {lang === 'fr'
              ? 'Choisissez le CV à évaluer, chargez l\'offre (PDF/Word ou lien URL) et découvrez votre degré d\'adéquation ainsi que les points clés à défendre en entretien.'
              : 'Select your target CV, upload the job offer (PDF/Word or link URL) and analyze your compatibility score with tailored preparation tips.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="job-matching-guide-btn"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/90 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={lang === 'fr' ? 'Afficher ou masquer le guide de prise en main' : 'Toggle page guide'}
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{showGuide ? (lang === 'fr' ? 'Masquer le guide' : 'Hide Guide') : (lang === 'fr' ? '💡 Guide de la page' : '💡 Page Guide')}</span>
          </button>

          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'fr' ? '← Dashboard' : '← Dashboard'}
          </button>
        </div>
      </div>

      {/* Dedicated Contextual Onboarding Guide */}
      {showGuide && (
        <MenuOnboardingGuide
          menu="matching"
          lang={lang}
          onDismiss={() => setShowGuide(false)}
          onStartGlobalTour={onBackToDashboard}
        />
      )}

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: CV Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF7A00] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'fr' ? 'Sélectionner le CV à évaluer' : 'Select the CV to evaluate'}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {cvs.length} {lang === 'fr' ? 'CV disponibles' : 'CVs available'}
              </span>
            </div>

            {cvs.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {lang === 'fr'
                  ? 'Aucun CV n\'est actuellement disponible. Veuillez d\'abord téléverser un CV dans la section "My CVs".'
                  : 'No CV uploaded yet. Please upload a CV first in the "My CVs" tab.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cvs.map((cv) => {
                  const isSelected = cv.id === selectedCvId;
                  return (
                    <div
                      key={cv.id}
                      onClick={() => setSelectedCvId(cv.id)}
                      className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-[#FF7A00] bg-orange-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#FF7A00] text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{cv.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{cv.roleTarget || 'Ingénieur Tech'}</p>
                          </div>
                        </div>

                        {cv.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">
                            Principal
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Score ATS</span>
                        <span className="font-bold text-slate-800">{cv.score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: Job Offer Upload / URL Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FF7A00] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'fr' ? 'Transmettre l\'offre d\'emploi' : 'Provide the job offer'}
                </h3>
              </div>

              {/* Toggle Source Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOfferSource('file')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    offerSource === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang === 'fr' ? 'Fichier (PDF / Word)' : 'File (PDF / Word)'}
                </button>
                <button
                  type="button"
                  onClick={() => setOfferSource('url')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    offerSource === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang === 'fr' ? 'Lien URL de l\'offre' : 'Offer URL Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setOfferSource('text')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    offerSource === 'text' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang === 'fr' ? 'Texte brut' : 'Raw Text'}
                </button>
              </div>
            </div>

            {/* TAB 1: File Upload */}
            {offerSource === 'file' && (
              <div className="space-y-3.5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-[#FF7A00] bg-orange-50/50'
                      : uploadedFile
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    id="job-offer-file-input"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="job-offer-file-input" className="cursor-pointer flex flex-col items-center">
                    {uploadedFile ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">{uploadedFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(uploadedFile.size / 1024).toFixed(1)} KB • Cliquez pour remplacer
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#FF7A00] flex items-center justify-center mb-2">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          {lang === 'fr'
                            ? 'Glissez-déposez la fiche de poste ou cliquez pour parcourir'
                            : 'Drag and drop job description file or click to browse'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Formats acceptés : PDF (.pdf), Word (.docx, .doc) — max 10MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'fr' ? 'Intitulé du poste (optionnel)' : 'Job Title (optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lead Cloud & Solutions Architect"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'fr' ? 'Entreprise / Organisation' : 'Company / Organization'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Wave Mobile Money, Paystack, Orange..."
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: URL Link */}
            {offerSource === 'url' && (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    {lang === 'fr' ? 'Lien public de l\'offre d\'emploi' : 'Public job posting link'}
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="url"
                      placeholder="https://www.linkedin.com/jobs/view/... ou https://welcomekit.co/..."
                      value={offerUrl}
                      onChange={(e) => setOfferUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                    />
                  </div>
                </div>

                {/* Quick Examples for Testing */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-600 mb-1.5">
                    {lang === 'fr' ? 'Ou testez avec une offre exemple :' : 'Or test with an example job :'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOfferUrl('https://wave.com/careers/lead-platform-architect');
                        setCustomJobTitle('Principal Platform & Cloud Architect');
                        setCustomCompany('Wave Mobile Money');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#FF7A00] transition-colors cursor-pointer"
                    >
                      Wave • Principal Architect
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOfferUrl('https://paystack.com/careers/staff-systems-engineer');
                        setCustomJobTitle('Staff Distributed Systems Engineer');
                        setCustomCompany('Paystack');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-[#FF7A00] transition-colors cursor-pointer"
                    >
                      Paystack • Staff Systems Engineer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'fr' ? 'Poste ciblé' : 'Target Role'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lead Cloud Solutions Architect"
                      value={customJobTitle}
                      onChange={(e) => setCustomJobTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'fr' ? 'Entreprise' : 'Company'}
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Fintech / Tech Corp"
                      value={customCompany}
                      onChange={(e) => setCustomCompany(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Raw Text */}
            {offerSource === 'text' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  {lang === 'fr' ? 'Collez la description complète de l\'offre' : 'Paste full job description'}
                </label>
                <textarea
                  rows={5}
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder={
                    lang === 'fr'
                      ? 'Collez ici les missions, compétences requises, stack technique et responsabilités du poste...'
                      : 'Paste responsibilities, requirements, and tech stack here...'
                  }
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] resize-none"
                />
              </div>
            )}

            {/* Launch Evaluation CTA */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {selectedCV && (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    CV sélectionné : <strong>{selectedCV.name}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                id="evaluate-job-match-btn"
                disabled={!isFormValid() || isAnalyzing}
                onClick={handleRunEvaluation}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                  isFormValid() && !isAnalyzing
                    ? 'bg-[#FF7A00] hover:bg-[#E66E00] text-white active:scale-98 shadow-orange-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{lang === 'fr' ? 'Analyse en cours...' : 'Analyzing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'fr' ? 'Évaluer l\'adéquation avec l\'offre' : 'Evaluate Job Match'}</span>
                  </>
                )}
              </button>
            </div>

            {/* In-progress progress banner */}
            {isAnalyzing && (
              <div className="mt-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 flex items-center gap-3 animate-pulse">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A00]" />
                <span className="font-medium">{analysisStep}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Matching Result or Guidance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {currentMatch ? (
            <div className="bg-white rounded-2xl border-2 border-orange-200 p-5 shadow-md space-y-5">
              {/* Result Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    {lang === 'fr' ? 'Diagnostic d\'adéquation terminé' : 'Match Evaluation Ready'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">{currentMatch.jobTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentMatch.company} • {currentMatch.location}
                  </p>
                </div>

                {/* Score badge */}
                <div className="text-right">
                  <div className="inline-flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-[#0B1528] text-white border border-slate-700 shadow-sm">
                    <span className="text-base font-black text-[#FF7A00] leading-none">{currentMatch.matchScore}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-300 mt-0.5">Match</span>
                  </div>
                </div>
              </div>

              {/* Sub-scores breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Technique</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{currentMatch.technicalMatchScore}%</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Expérience</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{currentMatch.experienceMatchScore}%</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Soft Skills</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{currentMatch.softSkillsMatchScore}%</p>
                </div>
              </div>

              {/* Summary description */}
              <p className="text-xs text-slate-600 bg-orange-50/50 border border-orange-100 p-3 rounded-xl leading-relaxed">
                {currentMatch.summary}
              </p>

              {/* Strengths */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === 'fr' ? 'Points forts face à l\'offre' : 'Profile Strengths for this Offer'}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {currentMatch.strengths.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/60">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps to prepare */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {lang === 'fr' ? 'Écarts & Points à valoriser' : 'Gaps & Points to Address'}
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {currentMatch.gaps.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-amber-50/40 p-2 rounded-lg border border-amber-100/80">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Matched & Missing Keywords Tags */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-700 mb-1.5">
                  {lang === 'fr' ? 'Mots-clés ATS détectés' : 'ATS Keywords'}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {currentMatch.matchedKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                      ✓ {kw}
                    </span>
                  ))}
                  {currentMatch.missingKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                      + {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* CRITICAL USER REQUIREMENT: PROMPT FOR MOCK INTERVIEW */}
              <div className="bg-[#0B1528] rounded-2xl p-4 text-white space-y-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FF7A00] flex items-center justify-center text-white">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {lang === 'fr' ? 'Préparez l\'entretien pour ce poste' : 'Prepare Interview for this Role'}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {lang === 'fr'
                        ? 'Simulez un entretien technique avec les questions réelles de cette offre.'
                        : 'Simulate a mock interview with tailored questions for this job.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="start-mock-interview-from-match-btn"
                  onClick={() => onMockInterviewForJob(currentMatch)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>
                    {lang === 'fr'
                      ? 'Lancer une simulation d\'entretien pour cette offre →'
                      : 'Launch Mock Interview for this Job →'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mx-auto shadow-xs">
                <Briefcase className="w-7 h-7 text-[#FF7A00]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'fr' ? 'Aucune évaluation en cours' : 'No evaluation in progress'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  {lang === 'fr'
                    ? 'Sélectionnez un CV à gauche, fournissez la fiche de poste (fichier ou lien URL) puis cliquez sur "Évaluer l\'adéquation".'
                    : 'Select a CV, upload the job offer or paste its URL, then click "Evaluate Job Match".'}
                </p>
              </div>

              {/* Quick perks preview */}
              <div className="text-left space-y-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Calcul d'adéquation sémantique et compatibilité ATS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Identification des forces et des compétences manquantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Passerelle directe vers simulation d'entretien ciblée</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION: Recent Matching History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#FF7A00]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'fr' ? 'Historique récent de vos matchings d\'offres' : 'Recent Job Matches History'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'fr'
                  ? 'Retrouvez vos offres évaluées et relancez un entraînement à tout moment.'
                  : 'Review past evaluations and launch mock interviews anytime.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {matchesHistory.length} {lang === 'fr' ? 'évaluations' : 'matches'}
          </span>
        </div>

        {matchesHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {lang === 'fr' ? 'Aucun matching enregistré pour le moment.' : 'No match recorded yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {matchesHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentMatch(item)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  currentMatch?.id === item.id
                    ? 'border-[#FF7A00] bg-orange-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 hover:text-[#FF7A00] transition-colors">
                        {item.jobTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {item.company} • {item.location || 'Remote'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                        {item.matchScore}%
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryMatch(e, item.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer de l'historique"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span>CV : {item.cvName}</span>
                    <span>•</span>
                    <span>{item.date}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {item.offerSource === 'url' ? 'Lien Web' : item.offerSource === 'file' ? 'Fichier PDF' : 'Texte brut'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMockInterviewForJob(item);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#FF7A00] hover:text-[#E66E00] hover:underline"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>{lang === 'fr' ? 'Simuler un entretien' : 'Mock Interview'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
