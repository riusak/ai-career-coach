'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cleanSpokenText, useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type { InterviewLanguage, InterviewerId } from '@/types/interview';

export interface PlayInterviewAudioOptions {
  text: string;
  speakerId: InterviewerId;
  language?: InterviewLanguage;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export function useInterviewAudioPlayer() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<InterviewerId | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  // Browser speech synthesis fallback
  const {
    isSupported: localTtsSupported,
    speak: localSpeak,
    cancel: localCancel,
  } = useSpeechSynthesis();

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    localCancel();
    setIsSpeaking(false);
    setActiveSpeakerId(null);
  }, [localCancel]);

  const play = useCallback(
    async (options: PlayInterviewAudioOptions) => {
      stop();

      const cleaned = cleanSpokenText(options.text);
      if (!cleaned) return;

      const speakerId = options.speakerId || 'alisor';
      const language = options.language || 'fr';

      setActiveSpeakerId(speakerId);
      setIsSpeaking(true);
      options.onStart?.();

      try {
        // 1. Try High-Definition Neural TTS API Route
        const response = await fetch('/api/interview/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleaned,
            speakerId,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS API returned HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        activeUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          setActiveSpeakerId(null);
          if (activeUrlRef.current) {
            URL.revokeObjectURL(activeUrlRef.current);
            activeUrlRef.current = null;
          }
          options.onEnd?.();
        };

        audio.onerror = () => {
          console.warn('[useInterviewAudioPlayer] Audio playback error, falling back to local TTS');
          fallbackToLocal();
        };

        await audio.play();
      } catch (err) {
        console.warn('[useInterviewAudioPlayer] HD Neural TTS unavailable, falling back to Web Speech API:', err);
        fallbackToLocal();
      }

      function fallbackToLocal() {
        if (!localTtsSupported) {
          setIsSpeaking(false);
          setActiveSpeakerId(null);
          return;
        }

        localSpeak(cleaned, {
          lang: language,
          gender: speakerId === 'marc' ? 'male' : 'female',
          onStart: () => {
            setIsSpeaking(true);
            setActiveSpeakerId(speakerId);
          },
          onEnd: () => {
            setIsSpeaking(false);
            setActiveSpeakerId(null);
            options.onEnd?.();
          },
          onError: (err) => {
            setIsSpeaking(false);
            setActiveSpeakerId(null);
            options.onError?.(err);
          },
        });
      }
    },
    [localSpeak, localTtsSupported, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSpeaking,
    activeSpeakerId,
    play,
    stop,
  };
}
