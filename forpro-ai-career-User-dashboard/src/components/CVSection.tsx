import React from 'react';
import { FileText, MoreHorizontal, Plus, ArrowUpRight } from 'lucide-react';
import { CVDocument } from '../types';

interface CVSectionProps {
  cvs: CVDocument[];
  onUploadClick: () => void;
  onSelectCV: (cv: CVDocument) => void;
  onViewAll?: () => void;
  lang: 'en' | 'fr';
}

export const CVSection: React.FC<CVSectionProps> = ({
  cvs,
  onUploadClick,
  onSelectCV,
  onViewAll,
  lang,
}) => {
  const isFrench = lang === 'fr';

  return (
    <div
      id="cv-section-card"
      className="bg-white rounded-3xl p-5 sm:p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between h-auto lg:h-full gap-4"
    >
      <div className="flex items-center justify-between mb-2.5 shrink-0">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg">
          {isFrench ? "Vos CVs" : "Your CVs"}
        </h3>
        <button
          onClick={onViewAll || onUploadClick}
          className="text-xs font-semibold text-[#FF7A00] hover:text-[#E66E00] flex items-center gap-1 group cursor-pointer"
        >
          <span>{isFrench ? "Tout voir" : "View all"}</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 xl:gap-3 flex-1 items-stretch">
        {cvs.map((cv) => (
          <div
            key={cv.id}
            id={`cv-card-${cv.id}`}
            onClick={() => onSelectCV(cv)}
            className="p-3 rounded-xl border border-slate-200/90 bg-white hover:border-[#FF7A00]/60 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                {cv.isPrimary ? (
                  <span className="bg-[#E8F8F0] text-[#10B981] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {isFrench ? "Principal" : "Primary"}
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCV(cv);
                  }}
                  className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-start gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 group-hover:text-[#FF7A00] transition-colors" />
                <h4 className="text-xs font-bold text-slate-900 truncate" title={cv.name}>
                  {cv.name}
                </h4>
              </div>

              <p className="text-[10px] text-slate-400 pl-5">
                {isFrench ? "Mis à jour :" : "Updated:"} {cv.lastUpdated}
              </p>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-black ${
                    cv.score >= 60
                      ? 'text-emerald-600'
                      : cv.score >= 50
                      ? 'text-[#FF7A00]'
                      : 'text-orange-600'
                  }`}
                >
                  {cv.score}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Score</span>
              </div>
            </div>
          </div>
        ))}

        <div
          id="upload-new-cv-dashed-card"
          onClick={onUploadClick}
          className="p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#FF7A00] bg-slate-50/40 hover:bg-orange-50/20 transition-all cursor-pointer flex flex-col items-center justify-center text-center group min-h-[105px]"
        >
          <div className="w-7 h-7 rounded-full bg-white border border-slate-200 group-hover:border-[#FF7A00] flex items-center justify-center text-slate-400 group-hover:text-[#FF7A00] mb-1.5 transition-all group-hover:scale-105">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 group-hover:text-[#FF7A00] leading-tight">
            {isFrench ? "Téléverser CV" : "Upload New CV"}
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">PDF, DOCX • Max 5MB</span>
        </div>
      </div>
    </div>
  );
};
