import React, { useState } from 'react';
import {
  X,
  FileText,
  Star,
  Sparkles,
  Briefcase,
  Video,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { CVDocument } from '../types';

interface CVPreviewModalProps {
  cv: CVDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSetPrimary: (cvId: string) => void;
  onAnalyze: (cv: CVDocument) => void;
  onMatchJobs: (cv: CVDocument) => void;
  onMockInterview: (cv: CVDocument) => void;
  onDelete: (cvId: string) => void;
  lang: 'en' | 'fr';
}

export const CVPreviewModal: React.FC<CVPreviewModalProps> = ({
  cv,
  isOpen,
  onClose,
  onSetPrimary,
  onAnalyze,
  onMatchJobs,
  onMockInterview,
  onDelete,
  lang,
}) => {
  const isFrench = lang === 'fr';
  const [activeTab, setActiveTab] = useState<'preview' | 'analysis' | 'services'>('preview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen || !cv) return null;

  const parsed = cv.parsedContent;
  const analysis = cv.analysis;

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setActiveTab('analysis');
      onAnalyze(cv);
    }, 1200);
  };

  const handleDownload = () => {
    // Generate a downloadable text or simulated blob
    const content = `CV: ${cv.name}\nCandidate: ${parsed?.fullName || 'Marius Akolly'}\nTarget: ${cv.roleTarget || 'Lead Architect'}\nScore ATS: ${cv.score}%\n\nSummary:\n${parsed?.summary || ''}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cv.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="cv-preview-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="cv-preview-modal-container"
        className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative"
      >
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF7A00] flex items-center justify-center shrink-0 border border-orange-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                  {cv.name}
                </h3>
                {cv.isPrimary ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    {isFrench ? 'CV Principal' : 'Primary CV'}
                  </span>
                ) : (
                  <button
                    onClick={() => onSetPrimary(cv.id)}
                    className="text-[10px] font-bold text-slate-600 hover:text-[#FF7A00] bg-white border border-slate-200 hover:border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Star className="w-3 h-3 text-slate-400" />
                    {isFrench ? 'Définir comme principal' : 'Set as primary'}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFrench ? 'Modifié le' : 'Last updated'} {cv.lastUpdated} • {cv.size} • {isFrench ? 'Score ATS :' : 'ATS Score :'} <strong className="text-slate-800">{cv.score}%</strong>
              </p>
            </div>
          </div>

          {/* Action Tabs & Close */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* View Switcher Pills */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isFrench ? 'Aperçu Document' : 'Document Preview'}
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{isFrench ? 'Diagnostic ATS' : 'ATS Analysis'}</span>
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === 'services'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{isFrench ? 'Services IA' : 'AI Services'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/50">
          
          {/* TAB 1: Real Paper Document Preview */}
          {activeTab === 'preview' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200/90 p-6 sm:p-10 font-sans text-slate-800 select-text">
              
              {/* Document Header */}
              <div className="border-b border-slate-200 pb-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {parsed?.fullName || 'Marius Akolly'}
                    </h1>
                    <p className="text-sm sm:text-base font-bold text-[#FF7A00] mt-1">
                      {parsed?.title || cv.roleTarget || 'Senior Software Engineer & Systems Architect'}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold self-start">
                    {cv.version || 'Version Finale'}
                  </div>
                </div>

                {/* Contact items */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium mt-3">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parsed?.email || 'akollymarius@gmail.com'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parsed?.phone || '+228 90 12 34 56'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{parsed?.location || 'Lomé, Togo'}</span>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  {isFrench ? 'Profil Professionnel & Synthèse' : 'Professional Summary'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {parsed?.summary ||
                    'Senior Software Engineer with 8+ years designing high-throughput distributed microservices, fintech payment bridges, and cloud-native systems.'}
                </p>
              </div>

              {/* Work Experience Timeline */}
              <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  {isFrench ? 'Expériences Professionnelles' : 'Work Experience'}
                </h2>
                <div className="space-y-4">
                  {(parsed?.experiences || [
                    {
                      role: 'Senior Software Engineer / Engineering Manager',
                      company: 'Moov Africa',
                      period: '2023 - Present',
                      highlights: [
                        'Spearheaded the core mobile money gateway bridge processing over 15M+ daily transactions.',
                        'Architected distributed event streaming with Apache Kafka and Spring Boot microservices.',
                      ],
                    },
                  ]).map((exp, idx) => (
                    <div key={idx} className="border-l-2 border-slate-200 pl-3.5 relative">
                      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#FF7A00]" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h3 className="font-bold text-slate-900 text-sm">
                          {exp.role} • <span className="text-[#FF7A00]">{exp.company}</span>
                        </h3>
                        <span className="text-xs font-semibold text-slate-400">
                          {exp.period}
                        </span>
                      </div>
                      <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-slate-600">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Skills */}
              <div className="mb-6">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  {isFrench ? 'Compétences Techniques & Architectures' : 'Technical Proficiencies'}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {(parsed?.skills || ['Java', 'Spring Boot', 'Kafka', 'Kubernetes', 'AWS', 'PostgreSQL', 'Docker']).map(
                    (skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Education & Certifications */}
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  {isFrench ? 'Formations & Certifications' : 'Education & Certifications'}
                </h2>
                <div className="space-y-2 text-xs text-slate-700">
                  {parsed?.education?.map((edu, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-bold">{edu.degree} — {edu.school}</span>
                      <span className="text-slate-400 font-semibold">{edu.year}</span>
                    </div>
                  ))}
                  {parsed?.certifications?.map((cert, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: In-Depth ATS Diagnostic & Analysis */}
          {activeTab === 'analysis' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
              
              {/* Score Showcase Hero */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-2xl bg-orange-500/10 border-2 border-[#FF7A00] flex flex-col items-center justify-center shrink-0">
                    <span className="text-3xl font-black text-[#FF7A00] leading-none">
                      {cv.score}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      Score ATS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">
                      {isFrench ? 'Diagnostic IA du CV' : 'AI Resume Diagnostic'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                      {analysis?.summary || (isFrench
                        ? 'Votre CV présente une excellente densité technique pour le rôle de Lead Architect.'
                        : 'Your resume shows strong technical qualifications for Lead Architect positions.')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{isAnalyzing ? (isFrench ? 'Analyse en cours...' : 'Analyzing...') : (isFrench ? 'Relancer l’analyse' : 'Re-run Analysis')}</span>
                </button>
              </div>

              {/* Subscores Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">
                    {isFrench ? 'Impact & Chiffres' : 'Impact & Metrics'}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-slate-900">{analysis?.impactScore || 92}%</span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysis?.impactScore || 92}%` }} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">
                    {isFrench ? 'Correspondance Mots-Clés' : 'Keyword Match'}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-slate-900">{analysis?.keywordsMatchScore || 86}%</span>
                    <Layers className="w-5 h-5 text-[#FF7A00]" />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2">
                    <div className="h-full bg-[#FF7A00] rounded-full" style={{ width: `${analysis?.keywordsMatchScore || 86}%` }} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">
                    {isFrench ? 'Grammaire & Clarté' : 'Grammar & Clarity'}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-slate-900">{analysis?.grammarScore || 94}%</span>
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analysis?.grammarScore || 94}%` }} />
                  </div>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs">
                  <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{isFrench ? 'Points Forts Détectés' : 'Key Strengths'}</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {(analysis?.strengths || [
                      'Forte présence de métriques concrètes (15M+ utilisateurs, 42% gain de latence)',
                      'Architecture événementielle et cloud-native moderne (Kafka, K8s, Spring Boot)',
                      'Trajectoire claire vers des responsabilités de Lead Architect',
                    ]).map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs">
                  <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>{isFrench ? 'Axes d’Amélioration Ciblés' : 'Recommended Fixes'}</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {(analysis?.improvements || [
                      'Intégrer les mots-clés de gouvernance d’entreprise (TOGAF 9.2, Zero Trust)',
                      'Ajouter les métriques d’optimisation financière Cloud (FinOps, ROI)',
                    ]).map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Matched vs Missing Keywords */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 mb-3">
                  {isFrench ? 'Audit des Mots-Clés Spécifiques (Cible : Lead Architect)' : 'Keyword Audit for Target Role'}
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1.5">
                      ✓ {isFrench ? 'Mots-clés validés dans votre CV' : 'Detected Keywords'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis?.matchedKeywords || ['Kafka', 'Kubernetes', 'Microservices', 'AWS', 'Spring Boot']).map((k) => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-[#FF7A00] uppercase tracking-wider block mb-1.5">
                      + {isFrench ? 'Mots-clés recommandés à ajouter' : 'Suggested Keywords to Add'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis?.missingKeywords || ['TOGAF 9.2', 'Zero Trust Architecture', 'FinOps', 'Multi-Cloud DR']).map((k) => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#FF7A00] border border-amber-200 text-xs font-medium">
                          +{k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI Services & Direct Workflows */}
          {activeTab === 'services' && (
            <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {isFrench ? 'Services & Actions ForPro AI pour ce CV' : 'ForPro AI Services for this CV'}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {isFrench
                    ? 'Déclenchez directement les services professionnels en utilisant ce document comme profil de référence.'
                    : 'Launch specialized workflows utilizing this CV as the authoritative baseline.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Service 1: Job Matching */}
                  <div
                    onClick={() => onMatchJobs(cv)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#FF7A00] hover:shadow-md bg-white transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF7A00] flex items-center justify-center mb-3">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#FF7A00] transition-colors flex items-center gap-1.5">
                      <span>{isFrench ? 'Lancer le Job Matching' : 'Launch Job Matching'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {isFrench
                        ? 'Recherchez les opportunités Lead Architect et Staff Engineer correspondant au contenu de ce CV.'
                        : 'Match this specific CV against top international and African engineering roles.'}
                    </p>
                  </div>

                  {/* Service 2: Mock Interview */}
                  <div
                    onClick={() => onMockInterview(cv)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-[#FF7A00] hover:shadow-md bg-white transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-3">
                      <Video className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                      <span>{isFrench ? 'Simulation d’Entretien IA' : 'AI Mock Interview'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {isFrench
                        ? 'Entraînez-vous à répondre aux questions de System Design basées sur les projets cités dans ce CV.'
                        : 'Practice tailored system architecture and behavioral questions based on this CV.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Management Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isFrench ? 'Gestion du Fichier & Téléchargement' : 'Document File Management'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isFrench ? 'Exportez votre CV ou supprimez-le de la base de données.' : 'Export your document or delete it from the database.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isFrench ? 'Télécharger' : 'Download'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(isFrench ? `Voulez-vous supprimer définitivement "${cv.name}" ?` : `Delete "${cv.name}" permanently?`)) {
                        onDelete(cv.id);
                        onClose();
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFrench ? 'Supprimer' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Bar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!cv.isPrimary && (
              <button
                onClick={() => onSetPrimary(cv.id)}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                <span>{isFrench ? 'Définir comme CV Principal' : 'Set as Primary CV'}</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{isFrench ? 'Télécharger' : 'Download'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onMatchJobs(cv)}
              className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>{isFrench ? 'Faire un Matching' : 'Match Jobs'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
