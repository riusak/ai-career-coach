import React, { useState } from 'react';
import { X, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { CareerMilestone } from '../types';

interface AddExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: Partial<CareerMilestone>) => void;
  onLoadDemo: () => void;
  lang: 'en' | 'fr';
}

export const AddExperienceModal: React.FC<AddExperienceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onLoadDemo,
  lang,
}) => {
  const isFrench = lang === 'fr';

  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [yearRange, setYearRange] = useState('');
  const [domain, setDomain] = useState<'frontend' | 'backend' | 'architecture' | 'devops'>('backend');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !company) return;

    onSave({
      role,
      company,
      year: yearRange || '2024',
      yearRange: yearRange || '2024 - Present',
      domain,
      description: description || 'Key software engineering contributions and milestones.',
      keyMissions: [
        'Designed scalable software modules and automated workflows',
        'Collaborated with cross-functional engineering and product squads',
        'Maintained 99.9% uptime SLA on production endpoints'
      ],
      technologies: technologies.split(',').map((t) => t.trim()).filter(Boolean),
    });

    onClose();
  };

  return (
    <div
      id="add-experience-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="add-experience-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600"></div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {isFrench ? "Ajouter une Expérience" : "Add Work Experience"}
            </h3>
            <p className="text-xs text-slate-500">
              {isFrench
                ? "Enrichissez votre roadmap et calculez votre progression"
                : "Feed your career roadmap and calculate domain distribution"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-800">
              {isFrench ? "Charger le profil complet de Marius" : "Load Marius's Complete Profile"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onLoadDemo();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>{isFrench ? "Activer Démo" : "Load Preset"}</span>
            <ArrowRight className="w-3 h-3 text-slate-950" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isFrench ? "Intitulé du poste *" : "Job Title / Role *"}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Software Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? "Entreprise *" : "Company *"}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Moov Africa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? "Période" : "Years / Period"}
              </label>
              <input
                type="text"
                placeholder="e.g. 2023 - Present"
                value={yearRange}
                onChange={(e) => setYearRange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? "Domaine principal" : "Domain Focus"}
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              >
                <option value="backend">Backend Development</option>
                <option value="frontend">Frontend Development</option>
                <option value="architecture">System Architecture</option>
                <option value="devops">DevOps & Cloud</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? "Technologies (séparées par virgule)" : "Tech Stack (comma separated)"}
              </label>
              <input
                type="text"
                placeholder="React, Node.js, AWS"
                value={technologies}
                onChange={(e) => setTechnologies(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isFrench ? "Résumé des réalisations" : "Key Impact & Missions"}
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Led architecture refactoring, accelerated deployment pipelines by 40%..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isFrench ? "Annuler" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{isFrench ? "Enregistrer" : "Save Experience"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
