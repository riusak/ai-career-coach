'use client';

import { motion } from 'framer-motion';
import { Mic, Video, Volume2 } from 'lucide-react';
import AnimatedRecruiterAvatar from '@/components/dashboard/interview/AnimatedRecruiterAvatar';
import type { InterviewEmotion, InterviewerSpeaker } from '@/types/interview';

interface RecruiterVideoTileProps {
  speaker: InterviewerSpeaker;
  emotion: InterviewEmotion;
  isSpeaking: boolean;
  onReplayAudio?: () => void;
  className?: string;
}

export default function RecruiterVideoTile({
  speaker,
  emotion,
  isSpeaking,
  onReplayAudio,
  className = '',
}: RecruiterVideoTileProps) {
  const isAlisor = speaker.id === 'alisor';

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
        isSpeaking
          ? 'border-emerald-400/80 ring-2 ring-emerald-400/50 shadow-xl shadow-emerald-500/10'
          : 'border-slate-800/80 bg-slate-950'
      } ${className}`}
      style={{
        background: isAlisor
          ? 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 60%, #020617 100%)'
          : 'radial-gradient(circle at 50% 20%, #1e1e38 0%, #0d1117 60%, #030712 100%)',
      }}
    >
      {/* Background Studio Bokeh Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-10 left-1/4 w-40 h-40 rounded-full blur-3xl opacity-20 ${
            isAlisor ? 'bg-teal-500' : 'bg-blue-600'
          }`}
        />
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-15 bg-amber-500" />
      </div>

      {/* Top Header Bar inside Video Tile */}
      <div className="relative z-10 flex items-center justify-between p-3 sm:p-3.5">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide transition-colors ${
              isSpeaking
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span>{isSpeaking ? 'Prend la parole' : 'En écoute'}</span>
          </span>
        </div>

        {/* Video Quality Badge & Controls */}
        <div className="flex items-center gap-1.5">
          {onReplayAudio && (
            <button
              type="button"
              onClick={onReplayAudio}
              title="Réécouter l'intervention"
              className="p-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px]"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-[9px] font-mono text-slate-400">
            <Video className="w-2.5 h-2.5 text-slate-400" />
            <span>HD 1080p</span>
          </div>
        </div>
      </div>

      {/* Central Area: Animated Vector Recruiter */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-1 sm:py-2">
        <AnimatedRecruiterAvatar
          speakerId={speaker.id}
          emotion={emotion}
          isSpeaking={isSpeaking}
          size="md"
        />
      </div>

      {/* Bottom Name & Mic Overlay */}
      <div className="relative z-10 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3.5 py-2.5">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white truncate tracking-tight">
              {speaker.name}
            </h4>
            <span className="text-[10px] text-slate-400 truncate">
              • {speaker.title}
            </span>
          </div>
        </div>

        {/* Dynamic Mic & Audio Visualizer Bars */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSpeaking && (
            <div className="flex items-center gap-0.5 h-3.5">
              {[0.6, 1, 0.4, 0.8, 0.5].map((scale, i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full bg-emerald-400"
                  animate={{
                    height: isSpeaking
                      ? [`${scale * 4}px`, `${scale * 14}px`, `${scale * 6}px`]
                      : '3px',
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.4 + i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          )}

          <span
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
              isSpeaking
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
            }`}
          >
            <Mic className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
