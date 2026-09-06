'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Send,
  Target,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import AudioVisualizer from '@/components/dashboard/interview/AudioVisualizer';
import InterviewReportModal from '@/components/dashboard/interview/InterviewReportModal';
import RecruiterVideoTile from '@/components/dashboard/interview/RecruiterVideoTile';
import { useInterviewAudioPlayer } from '@/hooks/useInterviewAudioPlayer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  RECRUITER_PANEL,
  RECRUITER_PANEL_EN,
  extractCleanSpeech,
} from '@/lib/interview/prompts';
import type {
  InterviewEmotion,
  InterviewSession,
  InterviewTurn,
  InterviewerSpeaker,
  StarEvaluation,
  StepInterviewResponse,
} from '@/types/interview';

interface InterviewStudioProps {
  session: InterviewSession;
  initialTurn: InterviewTurn;
  onClose: () => void;
  onCompleted?: (session: InterviewSession) => void;
  onSessionUpdated?: (session: InterviewSession) => void;
}

export default function InterviewStudio({
  session: initialSession,
  initialTurn,
  onClose,
  onCompleted,
  onSessionUpdated,
}: InterviewStudioProps) {
  const [session, setSession] = useState<InterviewSession>(initialSession);
  const [currentStep, setCurrentStep] = useState(initialSession.currentStep || 1);
  const [isFollowup, setIsFollowup] = useState(false);

  const isFrench = session.language !== 'en';
  const panel = isFrench ? RECRUITER_PANEL : RECRUITER_PANEL_EN;

  const panelMembers: InterviewerSpeaker[] = useMemo(() => {
    if (session.panel && session.panel.length > 0) {
      return session.panel;
    }
    return [panel.alisor, panel.marc];
  }, [session.panel, panel]);

  // Current recruiter prompt & emotion & active speaker
  const [latestRecruiterTurn, setLatestRecruiterTurn] = useState<InterviewTurn>(initialTurn);
  const [currentEmotion, setCurrentEmotion] = useState<InterviewEmotion>(
    initialTurn.emotion || 'smiling'
  );

  const activeSpeaker: InterviewerSpeaker =
    latestRecruiterTurn.speaker ||
    panelMembers[0] ||
    panel.alisor;

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
  const [showQuitModal, setShowQuitModal] = useState(false);

  // High-Definition Neural Audio Player Hook
  const {
    isSpeaking,
    activeSpeakerId,
    play: playAudio,
    stop: stopAudio,
  } = useInterviewAudioPlayer();

  // Native Speech Recognition Hook with Diagnostic Help
  const {
    isListening,
    transcript: voiceTranscript,
    interimTranscript,
    error: speechError,
    errorCode: speechErrorCode,
    startListening,
    stopListening,
    requestPermission: requestMicPermission,
    resetTranscript,
  } = useSpeechRecognition({
    lang: session.language === 'en' ? 'en-US' : 'fr-FR',
    continuous: true,
    interimResults: true,
  });

  const playTurn = useCallback(
    (turn: InterviewTurn) => {
      const speakerId = turn.speaker?.id || panelMembers[0]?.id || 'alisor';
      playAudio({
        text: turn.content,
        speakerId,
        language: session.language,
      });
    },
    [panelMembers, playAudio, session.language]
  );

  // Play initial recruiter greeting on mount if autoPlay enabled
  const hasSpokenInitialRef = useRef(false);
  useEffect(() => {
    if (!hasSpokenInitialRef.current && autoPlayAudio) {
      hasSpokenInitialRef.current = true;
      playTurn(initialTurn);
    }
  }, [autoPlayAudio, initialTurn, playTurn]);

  // Handle final completion & STAR evaluation
  const triggerStarEvaluation = useCallback(async () => {
    setIsEvaluating(true);
    setErrorMessage(null);
    stopAudio();
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
          onSessionUpdated?.(result.session);
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
  }, [onCompleted, onSessionUpdated, session.id, stopAudio, stopListening]);

  // Handle candidate answer submission
  const handleSubmitAnswer = async () => {
    const rawAnswer = inputMode === 'voice' ? voiceTranscript.trim() : textInput.trim();
    if (!rawAnswer) {
      setErrorMessage(
        isFrench
          ? 'Veuillez formuler une réponse avant de valider.'
          : 'Please provide an answer before submitting.'
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    stopAudio();
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

      // Always display and play the recruiter's turn (including closing speech)
      const nextRecruiterTurn = stepData.recruiterTurn;
      setLatestRecruiterTurn(nextRecruiterTurn);
      setCurrentEmotion(stepData.emotion);
      setIsFollowup(stepData.isFollowup);
      setCurrentStep(stepData.currentStep);

      if (autoPlayAudio && nextRecruiterTurn.content) {
        playTurn(nextRecruiterTurn);
      }

      // If interview is completed, trigger STAR evaluation after the closing speech plays
      if (stepData.isCompleted) {
        // Estimate audio duration: ~100ms per word + 2s buffer for natural pause
        const wordCount = (nextRecruiterTurn.content || '').split(/\s+/).length;
        const estimatedAudioMs = Math.max(4000, wordCount * 100 + 2000);
        setTimeout(() => {
          triggerStarEvaluation();
        }, estimatedAudioMs);
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de communication avec le jury.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanDisplayQuestion = extractCleanSpeech(latestRecruiterTurn.content).text;

  return (
    <div
      role="region"
      aria-label="Studio d’Entretien IA en Visioconférence"
      className="relative flex flex-col min-h-[700px] w-full rounded-3xl border border-slate-800 bg-[#0B0F19] text-white shadow-2xl overflow-hidden"
    >
      {/* Top Visio Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 sm:px-7 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-[#FF7A00] border border-orange-500/30">
            <Video className="h-4 w-4" />
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
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Radio className="w-3 h-3 animate-pulse" />
                {isFrench ? 'Visio en direct' : 'Live Video Room'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {isFrench
                  ? `Jury de ${panelMembers.length} recruteur${panelMembers.length > 1 ? 's' : ''}`
                  : `${panelMembers.length}-Recruiter Panel`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Audio Auto-Play Toggle */}
          <button
            type="button"
            onClick={() => {
              if (autoPlayAudio) stopAudio();
              setAutoPlayAudio(!autoPlayAudio);
            }}
            title={autoPlayAudio ? 'Couper la voix du jury' : 'Activer la voix du jury'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
          >
            {autoPlayAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span className="hidden sm:inline">Voix HD Active</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Muet</span>
              </>
            )}
          </button>

          {/* STAR Report Action */}
          <button
            type="button"
            onClick={triggerStarEvaluation}
            disabled={isEvaluating || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-[#FF7A00] border border-orange-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFrench ? 'Bilan STAR' : 'STAR Report'}</span>
          </button>

          {/* Close / Interruption */}
          <button
            type="button"
            onClick={() => {
              stopAudio();
              stopListening();
              setShowQuitModal(true);
            }}
            aria-label="Quitter la visio"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Progress & Stage Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-6 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">
            {isFrench ? `Étape ${currentStep}/5` : `Stage ${currentStep}/5`}
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className={`h-2 rounded-full transition-all ${
                  step === currentStep
                    ? 'bg-[#FF7A00] w-7'
                    : step < currentStep
                    ? 'bg-emerald-500 w-4'
                    : 'bg-slate-700 w-4'
                }`}
              />
            ))}
          </div>
        </div>

        {isFollowup && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold animate-pulse">
            <Zap className="w-3 h-3 text-amber-400" />
            {isFrench ? 'Relance d’approfondissement' : 'Follow-up Challenge'}
          </span>
        )}
      </div>

      {/* Main Video Call Arena */}
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto">
        {/* Dynamic Recruiter Visio Grid */}
        <div
          className={`grid gap-4 ${
            panelMembers.length === 1
              ? 'grid-cols-1 max-w-xl mx-auto w-full'
              : panelMembers.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : panelMembers.length === 3
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {panelMembers.map((member) => {
            const isThisSpeaker =
              activeSpeakerId?.toLowerCase() === member.id.toLowerCase() ||
              activeSpeaker.id.toLowerCase() === member.id.toLowerCase();
            return (
              <RecruiterVideoTile
                key={member.id}
                speaker={member}
                emotion={isThisSpeaker ? currentEmotion : 'smiling'}
                isSpeaking={isSpeaking && isThisSpeaker}
                onReplayAudio={() => playTurn(latestRecruiterTurn)}
              />
            );
          })}
        </div>

        {/* Live Subtitle & Current Recruiter Dialogue Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 backdrop-blur-sm space-y-2 shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {activeSpeaker.name} • {activeSpeaker.title}
              </span>
            </div>

            <button
              type="button"
              onClick={() => playTurn(latestRecruiterTurn)}
              disabled={isSpeaking}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>{isFrench ? 'Réécouter' : 'Replay audio'}</span>
            </button>
          </div>

          <p className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed pt-1">
            {cleanDisplayQuestion}
          </p>
        </div>

        {/* Microphone Diagnostic Alert if error occurs */}
        {speechError && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <h4 className="font-bold text-amber-300">
                  {speechErrorCode === 'not-allowed'
                    ? isFrench
                    ? 'Accès au microphone bloqué'
                    : 'Microphone permission blocked'
                    : isFrench
                    ? 'Problème de périphérique microphone'
                    : 'Microphone device issue'}
                </h4>
                <p>{speechError}</p>
                <p className="text-[11px] text-amber-300/80">
                  {isFrench
                    ? 'Conseil Casque Bluetooth : vérifiez dans les Paramètres Son de Windows que votre casque est bien activé comme périphérique d’entrée par défaut.'
                    : 'Bluetooth Headset Tip: Ensure your headset is set as the default input device in Windows Sound settings.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const granted = await requestMicPermission();
                  if (granted) {
                    startListening();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isFrench ? 'Réessayer l’autorisation' : 'Retry Permission'}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setInputMode('text');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                {isFrench ? 'Passer en saisie écrite' : 'Switch to Text Input'}
              </button>
            </div>
          </div>
        )}

        {/* Live Pro-Tip STAR */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3.5 flex items-start gap-2.5 text-xs text-slate-400">
          <Target className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-bold text-slate-200">
              {isFrench ? 'Méthode STAR en visio : ' : 'STAR Method Live Tip: '}
            </strong>
            {isFrench
              ? "Parlez à la 1ère personne ('Je'). Donnez un contexte clair, vos actions clés et un résultat mesurable."
              : "Use 'I' instead of 'We'. Explain what you specifically delivered and quantify the outcome."}
          </p>
        </div>

        {/* Candidate Interactive Response Arena */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-md space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isFrench ? 'Votre Intervention' : 'Your Answer'}
            </span>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputMode('voice')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  inputMode === 'voice'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{isFrench ? 'Clavier' : 'Text'}</span>
              </button>
            </div>
          </div>

          {/* Voice Arena */}
          {inputMode === 'voice' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        stopAudio();
                        startListening();
                      }
                    }}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse'
                        : 'bg-[#FF7A00] hover:bg-[#E66E00] text-white shadow-md'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {isListening
                        ? isFrench
                          ? 'Microphone actif • Enregistrement en cours'
                          : 'Microphone active • Recording'
                        : isFrench
                        ? 'Cliquez sur le micro pour parler'
                        : 'Click mic to speak'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isFrench
                        ? 'Parlez naturellement face à votre caméra'
                        : 'Speak naturally to your camera'}
                    </p>
                  </div>
                </div>

                <AudioVisualizer isSpeaking={false} isListening={isListening} mode="compact" />
              </div>

              {/* Transcript Display */}
              <div className="min-h-[80px] p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-200">
                {voiceTranscript ? (
                  <p className="leading-relaxed">
                    <span>{voiceTranscript}</span>
                    {interimTranscript && (
                      <span className="text-slate-400 italic"> {interimTranscript}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">
                    {isFrench
                      ? 'Votre réponse vocale transcrite s’affichera ici en temps réel...'
                      : 'Your voice answer transcript will appear here in real-time...'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Written Text Input */}
          {inputMode === 'text' && (
            <div className="space-y-2">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                placeholder={
                  isFrench
                    ? 'Rédigez votre réponse selon la méthode STAR...'
                    : 'Type your answer using the STAR method...'
                }
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#FF7A00] focus:outline-none focus:ring-1 focus:ring-[#FF7A00] resize-none"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>{textInput.length} caractères</span>
                <span>{isFrench ? 'Appuyez sur Valider pour répondre' : 'Press Submit to answer'}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              {isFrench
                ? 'Le jury réagira de concert à votre intervention.'
                : 'The panel will react directly to your answer.'}
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
                  <span>{isFrench ? 'Le jury délibère...' : 'Panel thinking...'}</span>
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
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center text-white space-y-4">
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
                ? 'Le jury analyse l’intégralité de vos réponses, calibre vos scores Situation, Tâche, Action, Résultat et prépare vos formulations idéales.'
                : 'The panel is assessing your answers against the STAR criteria to produce your debriefing.'}
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

      {/* Interruption / Quit Modal */}
      {showQuitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-fade-slide-in"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isFrench ? 'Interrompre la visioconférence' : 'Interrupt Video Interview'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isFrench ? 'Comment souhaitez-vous clore cette session ?' : 'How would you like to exit?'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isFrench
                ? 'Vous pouvez archiver définitivement cette session (marquée comme interrompue dans votre tableau de bord) ou la conserver en cours pour y revenir plus tard.'
                : 'You can close and archive this session as interrupted or keep it in progress to resume later.'}
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  stopAudio();
                  stopListening();
                  try {
                    const res = await fetch('/api/interview/session', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sessionId: session.id, action: 'abandon' }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.session) {
                        onSessionUpdated?.(data.session);
                      }
                    }
                  } catch {
                    // ignore
                  }
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isFrench ? 'Clore et marquer comme interrompue' : 'Close and Mark as Interrupted'}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  stopListening();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                {isFrench ? 'Garder en cours pour reprendre plus tard' : 'Keep In Progress to Resume Later'}
              </button>

              <button
                type="button"
                onClick={() => setShowQuitModal(false)}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {isFrench ? 'Retourner à la visio' : 'Return to Video Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
