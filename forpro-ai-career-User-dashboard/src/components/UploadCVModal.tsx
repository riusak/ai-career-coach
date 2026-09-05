import React, { useState } from 'react';
import { X, UploadCloud, Loader2, Sparkles } from 'lucide-react';
import { CVDocument } from '../types';

interface UploadCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (cv: CVDocument) => void;
  lang: 'en' | 'fr';
}

export const UploadCVModal: React.FC<UploadCVModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  lang,
}) => {
  const isFrench = lang === 'fr';
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setUploading(true);

    setTimeout(() => {
      setUploading(false);
      const score = Math.floor(Math.random() * 20) + 75;
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const newDoc: CVDocument = {
        id: `cv-${Date.now()}`,
        name: file.name,
        lastUpdated: new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        score: score,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` || '1.4 MB',
        isPrimary: false,
        roleTarget: fileNameWithoutExt.includes('Lead')
          ? 'Lead Architect'
          : fileNameWithoutExt.includes('Backend')
          ? 'Senior Backend Engineer'
          : 'Fullstack Systems Engineer',
        version: 'v1.0 - Nouveau',
        parsedContent: {
          fullName: 'Marius Akolly',
          title: 'Senior Software Engineer & Systems Architect',
          email: 'akollymarius@gmail.com',
          phone: '+228 90 12 34 56',
          location: 'Lomé, Togo',
          summary:
            'Senior Software Engineer with 8+ years designing high-throughput distributed microservices, fintech payment bridges, and cloud-native systems.',
          experiences: [
            {
              role: 'Senior Software Engineer',
              company: 'Moov Africa',
              period: '2023 - Present',
              highlights: [
                'Architected mobile money transaction gateway handling 15M+ daily requests.',
                'Deployed Kafka streaming pipelines with sub-20ms latency.',
              ],
            },
            {
              role: 'Tech Lead',
              company: 'GVA Group',
              period: '2021 - 2023',
              highlights: [
                'Automated multi-region infrastructure provisioning using Terraform & Kubernetes.',
              ],
            },
          ],
          skills: ['Java', 'Spring Boot', 'Kafka', 'Kubernetes', 'AWS', 'PostgreSQL', 'Docker'],
          education: [
            {
              degree: 'Master of Science in Distributed Systems',
              school: 'University of Science & Technology',
              year: '2018',
            },
          ],
          certifications: ['AWS Solutions Architect', 'CKA (Kubernetes)'],
        },
        analysis: {
          atsScore: score,
          grammarScore: 92,
          keywordsMatchScore: Math.floor(score * 0.94),
          impactScore: Math.floor(score * 0.96),
          summary: `Analyse automatique effectuée pour ${file.name}. Très bon alignement avec les exigences de System Design et d'ingénierie senior.`,
          strengths: ['Bonne clarté structurelle', 'Métriques de performance démontrées'],
          improvements: ['Ajouter des mots-clés de gouvernance cloud', 'Mettre en valeur le budget managé'],
          matchedKeywords: ['Java', 'Kafka', 'Kubernetes', 'AWS', 'Spring Boot', 'PostgreSQL'],
          missingKeywords: ['TOGAF 9.2', 'Zero Trust Architecture', 'FinOps'],
          recommendedJobTitles: ['Lead Architect', 'Staff Software Engineer', 'Cloud Solutions Architect'],
        },
      };

      onUploadSuccess(newDoc);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="upload-cv-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="upload-cv-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {isFrench ? "Téléverser votre CV" : "Upload Your CV"}
            </h3>
            <p className="text-xs text-slate-500">
              {isFrench
                ? "L'IA analyse vos compétences et extrait vos jalons"
                : "AI parses skills and auto-extracts your timeline"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
            <h4 className="text-sm font-bold text-slate-800">
              {isFrench ? "Analyse IA de votre CV en cours..." : "AI Parsing & ATS Scoring..."}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              {isFrench
                ? "Extraction des postes, missions et calcul du score de compatibilité."
                : "Extracting roles, stack, and calculating benchmark career index."}
            </p>
          </div>
        ) : (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-amber-500 bg-amber-50/50'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/40 hover:bg-white'
              }`}
            >
              <input
                type="file"
                id="cv-file-input"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="cv-file-input"
                className="cursor-pointer flex flex-col items-center w-full"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {isFrench ? "Glissez votre fichier ici ou cliquez" : "Drag and drop your resume or browse"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  PDF, DOCX (Max 5 MB)
                </p>
              </label>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-slate-600">
                {isFrench
                  ? "Votre CV est automatiquement converti en jalons pour votre progression de carrière."
                  : "Your CV is parsed into career milestones for your ascending roadmap."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
