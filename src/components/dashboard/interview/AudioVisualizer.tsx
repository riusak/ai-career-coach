'use client';

interface AudioVisualizerProps {
  isSpeaking: boolean;
  isListening: boolean;
  mode?: 'compact' | 'full';
}

/**
 * Animated audio waves that react when the AI recruiter is speaking (orange pulse)
 * or when the user is speaking into the microphone (emerald waves).
 */
export default function AudioVisualizer({
  isSpeaking,
  isListening,
  mode = 'compact',
}: AudioVisualizerProps) {
  const active = isSpeaking || isListening;
  const barCount = mode === 'full' ? 24 : 12;

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-1.5 transition-all ${
        mode === 'full' ? 'h-16 py-2' : 'h-10'
      }`}
    >
      {Array.from({ length: barCount }).map((_, index) => {
        // Pseudo-random staggered heights and animation delays
        const baseHeight = 15 + ((index * 7) % 35);
        const activeHeight = 25 + ((index * 13) % 65);
        const delay = (index * 0.08).toFixed(2);
        const duration = (0.5 + ((index * 0.1) % 0.4)).toFixed(2);

        let colorClass = 'bg-slate-700/60';
        if (isSpeaking) {
          colorClass = 'bg-gradient-to-t from-[#FF7A00] to-[#FFA84D] shadow-[0_0_8px_rgba(255,122,0,0.5)]';
        } else if (isListening) {
          colorClass = 'bg-gradient-to-t from-emerald-500 to-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
        }

        return (
          <span
            key={index}
            style={{
              height: active ? `${activeHeight}px` : `${baseHeight}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
            className={`w-1 rounded-full transition-all duration-300 ${colorClass} ${
              active ? 'animate-pulse' : 'opacity-40'
            }`}
          />
        );
      })}
    </div>
  );
}
