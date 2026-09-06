'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Headphones,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import AudioVisualizer from '@/components/dashboard/interview/AudioVisualizer';
import InterviewReportModal from '@/components/dashboard/interview/InterviewReportModal';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import type {
  InterviewEmotion,
  InterviewSession,
  InterviewTurn,
  StarEvaluation,
  StepInterviewResponse,
} from '@/types/interview';

interface InterviewStudioProps {
  session: InterviewSession;
  initialTurn: InterviewTurn;
  onClose: () => void;
  onCompleted?: (session: InterviewSession) => void;
}

export default function InterviewStudio({
  session: initialSession,
  initialTurn,
  onClose,
  onCompleted,
}: InterviewStudioProps) {
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [currentStep, setCurrentStep] = useState(initialSession.currentStep || 1);
  const [isFollowup, setIsFollowup] = useState(false);

  // Current recruiter prompt & emotion
  const [latestRecruiterTurn, setLatestRecruiterTurn] = useState<InterviewTurn>(initialTurn);
  const [currentEmotion, setCurrentEmotion] = useState<InterviewEmotion>(
    initialTurn.emotion || 'smiling'
  );

  // Input modes: 'voice' | 'text'
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textInput, setTextInput] = useState('');

  // Audio toggles
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Loading states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Final evaluation report modal
  const [finalReport, setFinalReport] = useState<StarEvaluation | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Native Speech Hooks
  const {
    isSupported: sttSupported,
    isListening,
    transcript: voiceTranscript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: session.language === 'en' ? 'en-US' : 'fr-FR',
    continuous: true,
    interimResults: true,
  });

  const {
    isSupported: ttsSupported,
    isSpeaking,
    speak,
    cancel: cancelSpeech,
  } = useSpeechSynthesis();

  // Play initial recruiter greeting on mount if autoPlay enabled
  const hasSpokenInitialRef = useRef(false);
  useEffect(() => {
    if (!hasSpokenInitialRef.current && autoPlayAudio && ttsSupported) {
      hasSpokenInitialRef.current = true;
      speak(initialTurn.content, { lang: session.language });
    }
  }, [autoPlayAudio, initialTurn.content, session.language, speak, ttsSupported]);

  // Read latest recruiter question aloud
  const speakCurrentRecruiterTurn = () => {
    if (latestRecruiterTurn.content) {
      speak(latestRecruiterTurn.content, { lang: session.language });
    }
  };

  // Handle final completion & STAR evaluation
  const triggerStarEvaluation = useCallback(async () => {
    setIsEvaluating(true);
    setErrorMessage(null);
    cancelSpeech();
    stopListening();

    try {
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });

      if (!response.ok) {
        throw new Error(`Échec de l'évaluation (HTTP ${response.status})`);
      }

      const result = await response.json();
      if (result.starEvaluation) {
        setFinalReport(result.starEvaluation);
        setShowReportModal(true);
        if (result.session) {
          setSession(result.session);
          onCompleted?.(result.session);
        }
      } else {
        throw new Error(result.error || 'Aucune évaluation reçue.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la génération du bilan.';
      setErrorMessage(msg);
    } finally {
      setIsEvaluating(false);
    }
  }, [cancelSpeech, onCompleted, session.id, stopListening]);

  // Handle candidate answer submission
  const handleSubmitAnswer = async () => {
    const rawAnswer = inputMode === 'voice' ? voiceTranscript.trim() : textInput.trim();
    if (!rawAnswer) {
      setErrorMessage(
        session.language === 'en'
          ? 'Please provide an answer before submitting.'
          : 'Veuillez formuler une réponse avant de valider.'
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    cancelSpeech();
    stopListening();

    resetTranscript();
    setTextInput('');

    try {
      const response = await fetch('/api/interview/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          candidateAnswer: rawAnswer,
          isCandidateFollowup: isFollowup,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de l’envoi de la réponse (HTTP ${response.status})`);
      }

      const stepData = (await response.json()) as StepInterviewResponse & {
        recruiterTurn: InterviewTurn;
      };

      if (stepData.isCompleted) {
        // Interview cycle finished -> generate final STAR evaluation
        await triggerStarEvaluation();
        return;
      }

      const nextRecruiterTurn = stepData.recruiterTurn;
      setLatestRecruiterTurn(nextRecruiterTurn);
      setCurrentEmotion(stepData.emotion);
      setIsFollowup(stepData.isFollowup);
      setCurrentStep(stepData.currentStep);

      if (autoPlayAudio && ttsSupported && nextRecruiterTurn.content) {
        speak(nextRecruiterTurn.content, { lang: session.language });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de communication avec le recruteur.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmotionBadge = (emotion: InterviewEmotion) => {
    const isFrench = session.language !== 'en';
    switch (emotion) {
      case 'smiling':
        return { label: isFrench ? 'Souriant & Chaleureux' : 'Warm & Smiling', icon: '😊', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'curious':
        return { label: isFrench ? 'Curieux & Attentif' : 'Curious & Attentive', icon: '🧐', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'thoughtful':
        return { label: isFrench ? 'Réfléchi & Analytique' : 'Thoughtful & Analytical', icon: '🤔', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'skeptical':
        return { label: isFrench ? 'Challenger & Exigeant' : 'Challenging & Skeptical', icon: '🤨', color: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'impressed':
        return { label: isFrench ? 'Impressionné' : 'Impressed', icon: '✨', color: 'bg-orange-50 text-[#FF7A00] border-orange-200' };
      default:
        return { label: isFrench ? 'Professionnel' : 'Professional', icon: '💼', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const emotionBadge = getEmotionBadge(currentEmotion);
  const isFrench = session.language !== 'en';

  return (
    <div
      role="region"
      aria-label="Studio d’Entretien IA"
      className="relative flex flex-col min-h-[650px] w-full rounded-3xl border border-slate-200/80 bg-white shadow-xl overflow-hidden"
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 sm:px-7 py-4 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-[#FF7A00] border border-orange-500/30">
            <Headphones className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">{session.jobTitle}</h2>
              {session.company && (
                <span className="text-xs text-slate-400 font-medium truncate">
                  • {session.company}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {isFrench ? 'Simulation Vocale & STAR en direct' : 'Live Voice & STAR Simulation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Auto-Play Toggle */}
          <button
            type="button"
            onClick={() => {
              if (autoPlayAudio) cancelSpeech();
              setAutoPlayAudio(!autoPlayAudio);
            }}
            title={autoPlayAudio ? 'Couper la voix du recruteur' : 'Activer la voix du recruteur'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            {autoPlayAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span className="hidden sm:inline">Voix active</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Muet</span>
              </>
            )}
          </button>

          {/* Early finish / debriefing button */}
          <button
            type="button"
            onClick={triggerStarEvaluation}
            disabled={isEvaluating || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-[#FF7A00] border border-orange-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFrench ? 'Bilan STAR' : 'STAR Report'}</span>
          </button>

          {/* Close Studio */}
          <button
            type="button"
            onClick={() => {
              cancelSpeech();
              stopListening();
              onClose();
            }}
            aria-label="Quitter le studio"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress & Stage Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">
            {isFrench ? `Étape ${currentStep}/5` : `Stage ${currentStep}/5`}
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className={`h-2 w-5 rounded-full transition-all ${
                  step === currentStep
                    ? 'bg-[#FF7A00] w-7'
                    : step < currentStep
                    ? 'bg-emerald-500'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {isFollowup && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-700" />
            {isFrench ? '⚡ Relance d’approfondissement' : '⚡ Follow-up Challenge'}
          </span>
        )}
      </div>

      {/* Central Arena */}
      <div className="flex-1 p-5 sm:p-7 flex flex-col gap-6 overflow-y-auto">
        {/* Recruiter Persona & Question Card */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-md relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#FF7A00]/10 blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4">
            {/* Recruiter Avatar with Sound Aura */}
            <div className="relative shrink-0">
              <div
                className={`flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FF9E40] text-white shadow-lg transition-transform ${
                  isSpeaking ? 'scale-105 ring-4 ring-orange-500/40' : ''
                }`}
              >
                <span className="text-2xl" role="img" aria-label="avatar">
                  {emotionBadge.icon}
                </span>
              </div>
              {isSpeaking && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FF7A00]" />
                </span>
              )}
            </div>

            {/* Recruiter Header & Speech */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white tracking-wide">
                    {isFrench ? 'Recruteur Senior' : 'Lead Recruiter'}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${emotionBadge.color}`}
                  >
                    <span>{emotionBadge.icon}</span>
                    <span>{emotionBadge.label}</span>
                  </span>
                </div>

                {/* Re-listen Button */}
                <button
                  type="button"
                  onClick={speakCurrentRecruiterTurn}
                  disabled={isSpeaking}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                  <span>{isFrench ? 'Réécouter' : 'Replay audio'}</span>
                </button>
              </div>

              {/* The lively question text */}
              <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed pt-1">
                {latestRecruiterTurn.content}
              </p>
            </div>
          </div>

          {/* Audio Visualizer underneath */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-center">
            <AudioVisualizer
              isSpeaking={isSpeaking}
              isListening={isListening}
              mode="compact"
            />
          </div>
        </div>

        {/* Live Pro-Tip for STAR Method */}
        <div className="rounded-xl border border-brand-200/60 bg-brand-50/50 p-3.5 flex items-start gap-2.5 text-xs text-slate-700">
          <Sparkles className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold text-slate-900">
              {isFrench ? 'Conseil STAR en direct : ' : 'Live STAR Advice: '}
            </strong>
            {isFrench
              ? "Privilégiez le 'Je' plutôt que le 'On'. Citez une action précise que vous avez personnellement initiée et donnez un résultat mesurable."
              : "Use 'I' instead of 'We'. Explain what you specifically owned, decided, and quantify the final outcome."}
          </p>
        </div>

        {/* Candidate Input Arena */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          {/* Mode Switcher (Vocal vs Text) */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isFrench ? 'Votre Réponse' : 'Your Answer'}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'voice'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{isFrench ? 'Microphone' : 'Voice'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setInputMode('text');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'text'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                <span>{isFrench ? 'Clavier' : 'Text'}</span>
              </button>
            </div>
          </div>

          {/* Vocal Mode UI */}
          {inputMode === 'voice' ? (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 text-center">
              {/* Big Interactive Mic Button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    stopListening();
                  } else {
                    startListening();
                  }
                }}
                disabled={isSubmitting || isEvaluating}
                className={`relative flex h-20 w-20 items-center justify-center rounded-3xl transition-all shadow-md cursor-pointer ${
                  isListening
                    ? 'bg-emerald-500 text-white scale-105 shadow-emerald-500/30'
                    : 'bg-[#0B1528] text-white hover:bg-[#FF7A00]'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
                {isListening && (
                  <span className="absolute -inset-1 rounded-3xl border-2 border-emerald-400 animate-ping opacity-60" />
                )}
              </button>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {isListening
                    ? isFrench
                      ? 'Écoute en cours... Parlez naturellement.'
                      : 'Listening... Speak naturally.'
                    : isFrench
                    ? 'Cliquez sur le micro pour parler'
                    : 'Click microphone to answer'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {!sttSupported
                    ? isFrench
                      ? 'Micro non supporté par ce navigateur (basculez sur le mode Clavier)'
                      : 'Voice input not supported on this browser (switch to Text mode)'
                    : isFrench
                    ? 'Web Speech API native • 100% gratuit et privé'
                    : 'Native Web Speech API • 100% free and private'}
                </p>
              </div>

              {/* Live transcript bubble */}
              {(voiceTranscript || interimTranscript) && (
                <div className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>{isFrench ? 'Transcription en direct :' : 'Live transcript:'}</span>
                    <button
                      type="button"
                      onClick={resetTranscript}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      {isFrench ? 'Effacer' : 'Clear'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {voiceTranscript} <span className="italic text-slate-400">{interimTranscript}</span>
                  </p>
                </div>
              )}

              {speechError && (
                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{speechError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Text Mode UI */
            <div className="space-y-2">
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isFrench
                    ? 'Formulez votre réponse ici en précisant votre situation, la tâche à accomplir, vos actions concrètes et le résultat chiffré...'
                    : 'Formulate your answer here using Situation, Task, Action, Result...'
                }
                className="w-full rounded-2xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#FF7A00] focus:outline-none focus:ring-1 focus:ring-[#FF7A00] resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{textInput.length} caractères</span>
                <span>{isFrench ? 'Appuyez sur Envoyer pour répondre' : 'Press Submit to answer'}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              {isFrench
                ? 'L’IA réagira instantanément à votre intervention.'
                : 'The AI will react dynamically to your answer.'}
            </span>

            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || isEvaluating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isFrench ? 'Analyse du recruteur...' : 'Recruiter thinking...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isFrench ? 'Valider ma réponse →' : 'Submit Answer →'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Evaluating Overlay */}
      {isEvaluating && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6 text-center text-white space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-3xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-[#FF7A00]">
              <Award className="h-8 w-8 animate-bounce" />
            </div>
            <span className="absolute -inset-2 rounded-3xl border-2 border-orange-400 animate-ping opacity-40" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-white">
              {isFrench ? 'Évaluation STAR en cours...' : 'Compiling STAR Evaluation...'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isFrench
                ? 'Gemini analyse l’intégralité de vos réponses, calibre vos scores Situation, Tâche, Action, Résultat et prépare vos formulations idéales.'
                : 'Gemini is assessing all your answers against the STAR criteria to produce your custom debriefing.'}
            </p>
          </div>
        </div>
      )}

      {/* Final STAR Evaluation Report Modal */}
      <InterviewReportModal
        open={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          onClose();
        }}
        evaluation={finalReport}
        jobTitle={session.jobTitle}
        company={session.company}
        language={session.language}
      />
    </div>
  );
}
