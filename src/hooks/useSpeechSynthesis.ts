'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Strips bracketed emotion or stage tags like [rit légèrement], [soupir bienveillant],
 * *sourire*, etc. so the spoken synthesis sounds strictly human and fluid.
 */
export function cleanSpokenText(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]/g, '') // remove [emotion] tags
    .replace(/\*[^*]*\*/g, '') // remove *action* markdown cues
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface SpeakOptions {
  lang?: 'fr' | 'en';
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
}

export function useSpeechSynthesis() {
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'speechSynthesis' in window;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const handleVoicesChanged = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  const findBestVoice = useCallback(
    (lang: 'fr' | 'en'): SpeechSynthesisVoice | null => {
      if (voices.length === 0) return null;

      const targetLangPrefix = lang === 'en' ? 'en' : 'fr';
      const matchingVoices = voices.filter((v) =>
        v.lang.toLowerCase().startsWith(targetLangPrefix)
      );

      if (matchingVoices.length === 0) return voices[0] ?? null;

      // Prefer high-quality/natural OS voices
      const preferredKeywords = ['natural', 'google', 'paul', 'julie', 'denise', 'samantha', 'siri', 'premium'];
      for (const keyword of preferredKeywords) {
        const found = matchingVoices.find((v) =>
          v.name.toLowerCase().includes(keyword)
        );
        if (found) return found;
      }

      return matchingVoices[0];
    },
    [voices]
  );

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const cleaned = cleanSpokenText(text);
      if (!cleaned) return;

      // Stop previous utterance
      window.speechSynthesis.cancel();

      const lang = options.lang ?? 'fr';
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = lang === 'en' ? 'en-US' : 'fr-FR';
      utterance.rate = options.rate ?? 0.98; // Natural human cadence
      utterance.pitch = options.pitch ?? 1.0;

      const voice = findBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        options.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        options.onEnd?.();
      };

      utterance.onerror = (event) => {
        // 'interrupted' or 'canceled' are not fatal errors
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('[speechSynthesis] Error speaking text:', event.error);
          options.onError?.(new Error(`TTS error: ${event.error}`));
        }
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [findBestVoice]
  );

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    speak,
    cancel,
    pause,
    resume,
  };
}
