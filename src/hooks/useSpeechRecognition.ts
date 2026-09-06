'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API interface declarations for TypeScript compatibility
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { lang = 'fr-FR', continuous = true, interimResults = true } = options;

  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManuallyStoppedRef = useRef(false);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore already stopped
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (overrideLang?: string) => {
      if (typeof window === 'undefined') return;

      const SpeechRecognitionApi =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionApi) {
        setError('La reconnaissance vocale n’est pas supportée par ce navigateur.');
        return;
      }

      setError(null);
      isManuallyStoppedRef.current = false;

      // Stop any existing instance before restarting
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionApi();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = overrideLang || lang;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0]?.transcript ?? '';
            if (result.isFinal) {
              currentFinal += text;
            } else {
              currentInterim += text;
            }
          }

          if (currentFinal) {
            setTranscript((prev) => (prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim()));
          }
          setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
          // Ignore normal aborted or no-speech events when user is silent
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
          if (event.error === 'not-allowed') {
            setError('Accès au microphone refusé. Veuillez autoriser le micro dans votre navigateur.');
          } else {
            setError(`Erreur de reconnaissance vocale : ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setInterimTranscript('');
          // If continuous listening was not manually stopped, keep state synced
          if (!isManuallyStoppedRef.current && continuous) {
            setIsListening(false);
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Impossible de démarrer le micro.';
        setError(msg);
        setIsListening(false);
      }
    },
    [lang, continuous, interimResults]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const setManualTranscript = useCallback((text: string) => {
    setTranscript(text);
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setManualTranscript,
  };
}
