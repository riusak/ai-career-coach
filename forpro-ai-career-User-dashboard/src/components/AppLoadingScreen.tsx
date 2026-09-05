import React, { useEffect, useState } from 'react';
import { ForProLogo } from './ForProLogo';

interface AppLoadingScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onFinish,
  minDurationMs = 850,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Progressive bar fill
    const p1 = setTimeout(() => setProgress(55), 100);
    const p2 = setTimeout(() => setProgress(88), 350);
    const p3 = setTimeout(() => setProgress(100), 600);

    // Fade out and close
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 300);
      return () => clearTimeout(removeTimer);
    }, minDurationMs);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(fadeTimer);
    };
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      id="app-initial-loading-screen"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-gradient-to-b from-[#070D18] via-[#0B1528] to-[#0E1A2F] text-white transition-opacity duration-300 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient orange glow behind contracted logo */}
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-8 rounded-full bg-[#FF7A00]/20 blur-3xl animate-pulse pointer-events-none" />

        {/* Contracted ForPro Logo Monogram with subtle breathing scale */}
        <div className="relative animate-in zoom-in-90 duration-300 flex items-center justify-center p-3">
          <ForProLogo variant="contracted" theme="dark" size="lg" />
        </div>

        {/* Short, elegant brand subtitle */}
        <div className="mt-5 flex flex-col items-center space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-slate-300">
            <span className="text-white">ForPro</span>
            <span className="text-[#FF7A00]">AI</span>
          </div>

          {/* Micro Progress Bar */}
          <div className="w-36 h-1 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 p-px">
            <div
              className="h-full bg-gradient-to-r from-[#FF7A00] to-[#FFA040] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
