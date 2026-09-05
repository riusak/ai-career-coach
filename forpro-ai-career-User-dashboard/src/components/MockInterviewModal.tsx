import React, { useState } from 'react';
import { X, Video, Mic, Play } from 'lucide-react';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'fr';
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({ isOpen, onClose, lang }) => {
  const isFrench = lang === 'fr';
  const [selectedTopic, setSelectedTopic] = useState('system-design');
  const [sessionActive, setSessionActive] = useState(false);

  if (!isOpen) return null;

  const topics = [
    {
      id: 'system-design',
      title: isFrench ? 'Architecture & Conception Système' : 'System Design & High Scale Architecture',
      duration: '45 mins',
      difficulty: isFrench ? 'Niveau Senior / Lead' : 'Senior / Lead Level',
      desc: isFrench
        ? "Conception d'une plateforme de streaming vidéo globale résiliente à 10M de requêtes/sec."
        : 'Design a globally distributed resilient streaming platform handling 10M req/sec.',
    },
    {
      id: 'concurrency',
      title: isFrench ? 'Concurrence & Microservices Distribués' : 'Distributed Microservices & Concurrency',
      duration: '30 mins',
      difficulty: isFrench ? 'Niveau Senior' : 'Senior Level',
      desc: isFrench
        ? 'Gestion des transactions Saga, locks distribués et consistance éventuelle avec Kafka.'
        : 'Saga pattern workflows, distributed locks, and eventual consistency with Kafka.',
    },
    {
      id: 'leadership',
      title: isFrench ? 'Leadership Technique & Culture Ingénierie' : 'Engineering Leadership & Strategy',
      duration: '35 mins',
      difficulty: isFrench ? 'Niveau Staff / Principal' : 'Staff / Principal Level',
      desc: isFrench
        ? "Arbitrages techniques, mentorship, et montée en compétences d'équipes d'ingénieurs."
        : 'Navigating technical debt tradeoffs, mentoring teams, and scaling engineering culture.',
    },
  ];

  return (
    <div
      id="mock-interview-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="mock-interview-modal"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden text-left"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span className="p-1 rounded-md bg-indigo-500/15 text-indigo-700">
            <Video className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            {isFrench ? 'Simulateur d’Entretien IA' : 'AI Mock Interview Simulator'}
          </span>
        </div>

        <h3 className="text-xl font-black text-slate-900 mb-1">
          {isFrench ? 'Entraînement Technique en Temps Réel' : 'Real-time AI Technical Drills'}
        </h3>
        <p className="text-xs text-slate-500 mb-5">
          {isFrench
            ? "Mettez-vous en conditions réelles avec notre intervieweur IA et recevez un feedback immédiat sur votre raisonnement."
            : "Practice realistic tech interviews with real-time AI audio/text evaluation and instant architectural feedback."}
        </p>

        {sessionActive ? (
          <div className="p-5 rounded-2xl bg-slate-950 text-white text-center space-y-4 my-2">
            <div className="relative w-16 h-16 mx-auto rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Mic className="w-7 h-7 text-indigo-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-slate-950"></span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                {isFrench ? "Session d'entretien en cours..." : "Interview session active..."}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {isFrench
                  ? "Question 1 : « Expliquez comment vous géreriez la tolérance aux pannes sur un cluster Kubernetes distribué. »"
                  : 'Question 1: "Explain how you design fault-tolerant replication across multi-region Kubernetes clusters."'}
              </p>
            </div>
            <button
              onClick={() => setSessionActive(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
            >
              {isFrench ? 'Mettre fin à la simulation' : 'End Simulation'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {topics.map((t) => {
              const isSelected = selectedTopic === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {t.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{t.desc}</p>
                  <span className="text-[10px] font-semibold text-slate-400">⏱️ {t.duration}</span>
                </div>
              );
            })}
          </div>
        )}

        {!sessionActive && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
            >
              {isFrench ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={() => setSessionActive(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{isFrench ? 'Lancer la simulation IA' : 'Launch AI Simulation'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
