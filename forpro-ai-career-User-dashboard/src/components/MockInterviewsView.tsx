import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Award,
  Crown,
  Volume2,
  VolumeX,
  StopCircle,
  Upload,
  Link as LinkIcon,
  Globe,
  Briefcase,
  Layers,
  Trash2,
  FileText,
  UserCheck,
  ChevronDown,
  Lightbulb
} from 'lucide-react';
import { MockInterviewSession, JobOfferMatch, UserProfile } from '../types';
import {
  getStoredMatches,
  getStoredSessions,
  addStoredSession
} from '../utils/matchingStorage';
import { MenuOnboardingGuide } from './MenuOnboardingGuide';

interface MockInterviewsViewProps {
  user: UserProfile;
  initialMatch?: JobOfferMatch | null;
  onClearInitialMatch?: () => void;
  onBackToDashboard: () => void;
  onUpgradeClick: () => void;
  lang: 'en' | 'fr';
  isEmpty?: boolean;
}

interface QuestionDef {
  id: number;
  questionFr: string;
  questionEn: string;
  category: string;
  expectedKeywords: string[];
  idealPoints: string[];
}

export const MockInterviewsView: React.FC<MockInterviewsViewProps> = ({
  user,
  initialMatch,
  onClearInitialMatch,
  onBackToDashboard,
  onUpgradeClick,
  lang = 'fr',
  isEmpty = false,
}) => {
  // Check if user is Pro
  const isUserPro = user.plan?.toLowerCase().includes('pro') || false;

  // Language for simulation
  const [simLanguage, setSimLanguage] = useState<'fr' | 'en'>('fr');

  // Stored matches history & past sessions
  const [matchesHistory, setMatchesHistory] = useState<JobOfferMatch[]>(() =>
    isEmpty ? [] : getStoredMatches()
  );
  const [sessions, setSessions] = useState<MockInterviewSession[]>(() =>
    isEmpty ? [] : getStoredSessions()
  );
  const [activeSessionReview, setActiveSessionReview] = useState<MockInterviewSession | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Sync state if isEmpty changes
  useEffect(() => {
    if (isEmpty) {
      setMatchesHistory([]);
      setSessions([]);
    } else {
      setMatchesHistory(getStoredMatches());
      setSessions(getStoredSessions());
    }
  }, [isEmpty]);

  // Direct Job Offer Upload modal / panel state
  const [isDirectUploadOpen, setIsDirectUploadOpen] = useState(false);
  const [directSource, setDirectSource] = useState<'file' | 'url' | 'text'>('file');
  const [directFileName, setDirectFileName] = useState<string>('');
  const [directJobTitle, setDirectJobTitle] = useState<string>('');
  const [directCompany, setDirectCompany] = useState<string>('');
  const [directUrl, setDirectUrl] = useState<string>('');
  const [directText, setDirectText] = useState<string>('');

  // Active Target for Interview (either from initialMatch, from history click, or from direct upload)
  const [currentTarget, setCurrentTarget] = useState<{
    jobTitle: string;
    company: string;
    matchId?: string;
  }>({
    jobTitle: initialMatch ? initialMatch.jobTitle : 'Principal Platform & Cloud Architect',
    company: initialMatch ? initialMatch.company : 'Wave Mobile Money',
    matchId: initialMatch ? initialMatch.id : 'match-1',
  });

  // Active Simulation Studio State
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAudioMode, setIsAudioMode] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeechSpeaking, setIsSpeechSpeaking] = useState(false);
  const [audioWaves, setAudioWaves] = useState<number[]>([30, 60, 45, 80, 50, 75, 40]);
  const [timerSeconds, setTimerSeconds] = useState(240); // 4 min
  const [timerRunning, setTimerRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    clarityScore: number;
    depthScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  // Questions generator based on jobTitle
  const questions: QuestionDef[] = [
    {
      id: 1,
      questionFr: `Pouvez-vous vous présenter et expliquer comment votre parcours vous prépare au poste de ${currentTarget.jobTitle} chez ${currentTarget.company} ?`,
      questionEn: `Could you introduce yourself and explain how your background prepares you for the ${currentTarget.jobTitle} role at ${currentTarget.company}?`,
      category: 'Introduction & Fit',
      expectedKeywords: ['Expérience', 'High Scale', 'Architecture', 'Impact', 'Leadership'],
      idealPoints: [
        'Synthèse des 8+ années d\'expérience avec focus sur la haute disponibilité',
        'Lien direct avec les enjeux de paiements et d\'infrastructures critiques',
      ],
    },
    {
      id: 2,
      questionFr:
        'Face à un pic de trafic imprévu avec congestion de la base de données, comment garantissez-vous la consistance et l\'idempotence des transactions ?',
      questionEn:
        'During an unexpected traffic surge causing database congestion, how do you enforce consistency and transaction idempotency?',
      category: 'System Design & Scalability',
      expectedKeywords: ['Kafka', 'Outbox Pattern', 'Idempotency Key', 'Distributed Lock', 'Connection Pooling'],
      idealPoints: [
        'Mise en place de clés d\'idempotence avec Redis TTL',
        'Architecture Event-Driven avec découplage Kafka et retry backoff',
      ],
    },
    {
      id: 3,
      questionFr:
        'Comment avez-vous géré un désaccord technique majeur au sein de votre équipe lors du choix d\'une infrastructure cloud ? (Méthode STAR)',
      questionEn:
        'Describe a situation where you managed a major technical disagreement within your engineering team over cloud infrastructure choices. (STAR Method)',
      category: 'Leadership & Collaboration',
      expectedKeywords: ['Contexte', 'Écoute', 'Données / POC', 'Consensus', 'Décision'],
      idealPoints: [
        'Utilisation de benchmarks impartiaux et POCs comparatifs',
        'Alignement sur les coûts et l\'expérience développeur sans ego',
      ],
    },
  ];

  // If initialMatch prop updates, set current target
  useEffect(() => {
    if (initialMatch) {
      setCurrentTarget({
        jobTitle: initialMatch.jobTitle,
        company: initialMatch.company,
        matchId: initialMatch.id,
      });
    }
  }, [initialMatch]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isSimulating && timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isSimulating, timerRunning, timerSeconds]);

  // Audio wave pulsation effect when mic or speech is active
  useEffect(() => {
    let waveInterval: any = null;
    if (isMicActive || isSpeechSpeaking) {
      waveInterval = setInterval(() => {
        setAudioWaves([
          Math.floor(Math.random() * 60 + 20),
          Math.floor(Math.random() * 80 + 20),
          Math.floor(Math.random() * 95 + 10),
          Math.floor(Math.random() * 90 + 20),
          Math.floor(Math.random() * 85 + 20),
          Math.floor(Math.random() * 70 + 20),
          Math.floor(Math.random() * 50 + 20),
        ]);
      }, 150);
    }
    return () => clearInterval(waveInterval);
  }, [isMicActive, isSpeechSpeaking]);

  // Speak Question via Web Speech API
  const speakCurrentQuestion = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const currentQ = questions[currentQuestionIndex];
      const textToSpeak = simLanguage === 'fr' ? currentQ.questionFr : currentQ.questionEn;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = simLanguage === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeechSpeaking(true);
      utterance.onend = () => setIsSpeechSpeaking(false);
      utterance.onerror = () => setIsSpeechSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Launch Simulation
  const handleStartSimulation = (
    target: { jobTitle: string; company: string; matchId?: string },
    audioMode = true
  ) => {
    if (audioMode && !isUserPro) {
      // If user asks for audio but is not pro, notify or prompt upgrade
      onUpgradeClick();
      return;
    }

    setCurrentTarget(target);
    setIsAudioMode(audioMode);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setEvaluationResult(null);
    setTimerSeconds(240);
    setIsSimulating(true);
    setTimerRunning(true);
    setIsMicActive(false);

    // Auto-read question in audio mode
    setTimeout(() => {
      if (audioMode) {
        speakCurrentQuestion();
      }
    }, 400);
  };

  // Toggle Microphone recording
  const handleToggleMic = () => {
    if (isMicActive) {
      setIsMicActive(false);
    } else {
      setIsMicActive(true);
      // If user hasn't typed anything, fill realistic voice transcript after 3s
      if (!userAnswer) {
        setTimeout(() => {
          if (currentQuestionIndex === 0) {
            setUserAnswer(
              simLanguage === 'fr'
                ? 'Bonjour, je suis Marius Akolly, Lead Architect et Senior Software Engineer avec plus de 8 ans d\'expérience. Chez Moov Africa, j\'ai notamment conçu la passerelle de mobile money traitant plus de 15 millions de requêtes quotidiennes avec 99,99% de disponibilité grâce à Kafka et Spring Boot. Mon objectif chez ' +
                    currentTarget.company +
                    ' est d\'apporter cette résilience et ce leadership technique.'
                : 'Hello, I am Marius Akolly, Lead Architect and Senior Software Engineer with over 8 years of experience. At Moov Africa, I led the core mobile money gateway handling 15M+ daily transactions at 99.99% uptime with Kafka and Spring Boot microservices. My goal at ' +
                    currentTarget.company +
                    ' is to scale platform resilience and mentor senior engineering squads.'
            );
          } else if (currentQuestionIndex === 1) {
            setUserAnswer(
              simLanguage === 'fr'
                ? 'Pour absorber la charge, je découple immédiatement l\'ingestion de l\'exécution via Apache Kafka. L\'idempotence est garantie par une clé unique côté client stockée dans Redis avec un TTL adapté. En cas de congestion DB, nous utilisons le pattern Transactional Outbox avec Debezium pour assurer une consistance à terme sans verrouiller les tables critiques.'
                : 'To handle sudden traffic spikes, I decouple ingestion from write processing via Kafka event streams. Idempotency is enforced using a unique client request key verified against Redis. For DB bottlenecks, we implement the Transactional Outbox pattern with Debezium to maintain eventual consistency without locking relational tables.'
            );
          }
        }, 2200);
      }
    }
  };

  // Submit Answer & Next question or Final Evaluation
  const handleNextQuestion = () => {
    setIsMicActive(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer('');
      setTimerSeconds(240);
      setTimerRunning(true);
      setTimeout(() => {
        if (isAudioMode) {
          speakCurrentQuestion();
        }
      }, 300);
    } else {
      // Evaluate session
      setTimerRunning(false);
      setIsEvaluating(true);

      setTimeout(() => {
        const score = 91;
        const clarityScore = 93;
        const depthScore = 89;
        const result = {
          score,
          clarityScore,
          depthScore,
          feedback:
            simLanguage === 'fr'
              ? `Excellente simulation d'entretien pour le poste de ${currentTarget.jobTitle} chez ${currentTarget.company}. Vos explications sur l'idempotence et les patterns distribués étaient particulièrement précises et convaincantes.`
              : `Outstanding interview simulation for ${currentTarget.jobTitle} at ${currentTarget.company}. Your technical explanation of idempotency and event-driven resilience was clear and convincing.`,
          strengths: [
            simLanguage === 'fr'
              ? 'Structuration STAR exemplaire avec quantification des métriques (15M+ transactions, 99.99% SLA)'
              : 'Crisp STAR methodology with hard metrics cited (15M+ requests, 99.99% uptime)',
            simLanguage === 'fr'
              ? 'Clarté vocale et débit mesuré, vocabulaire technique adapté au niveau Staff/Lead'
              : 'Measured vocal delivery and high-level architectural technical fluency',
          ],
          improvements: [
            simLanguage === 'fr'
              ? 'Expliciter la stratégie de failover multi-régions en cas de panne globale du datacenter'
              : 'Elaborate further on multi-region failover strategies under global cloud outages',
          ],
        };

        const newSession: MockInterviewSession = {
          id: 'session-' + Date.now(),
          jobTitle: currentTarget.jobTitle,
          company: currentTarget.company,
          matchId: currentTarget.matchId,
          date: simLanguage === 'fr' ? 'À l\'instant' : 'Just now',
          duration: '12 min',
          score,
          clarityScore,
          depthScore,
          language: simLanguage,
          mode: isAudioMode ? 'audio' : 'text',
          feedback: result.feedback,
          strengths: result.strengths,
          recommendations: result.improvements,
        };

        const updated = addStoredSession(newSession);
        setSessions(updated);
        setEvaluationResult(result);
        setIsEvaluating(false);
      }, 1600);
    }
  };

  // Launch from Direct Upload form
  const handleLaunchDirectUpload = () => {
    const title = directJobTitle.trim() || directFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Lead Software Architect';
    const comp = directCompany.trim() || (directUrl ? 'Tech Enterprise' : 'Recruiting Company');
    setIsDirectUploadOpen(false);
    handleStartSimulation({ jobTitle: title, company: comp }, true);
  };

  const currentQ = questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div id="mock-interviews-view" className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF7A00]">
              <Video className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lang === 'fr' ? 'Simulations d\'Entretiens IA' : 'AI Mock Interviews'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {lang === 'fr'
              ? 'Entraînez-vous avec notre recruteur vocal IA en sélectionnant un matching récent ou en téléversant directement une offre d\'emploi.'
              : 'Practice with our AI voice recruiter by selecting a recent job match or uploading a job offer directly.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Guide Toggle */}
          <button
            id="mock-interviews-guide-btn"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/90 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title={lang === 'fr' ? 'Afficher ou masquer le guide de prise en main' : 'Toggle page guide'}
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#FF7A00]" />
            <span>{showGuide ? (lang === 'fr' ? 'Masquer guide' : 'Hide guide') : (lang === 'fr' ? '💡 Guide' : '💡 Guide')}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <button
              onClick={() => setSimLanguage('fr')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                simLanguage === 'fr' ? 'bg-[#FF7A00] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Français
            </button>
            <button
              onClick={() => setSimLanguage('en')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                simLanguage === 'en' ? 'bg-[#FF7A00] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
          </div>

          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {lang === 'fr' ? '← Dashboard' : '← Dashboard'}
          </button>
        </div>
      </div>

      {/* Dedicated Contextual Onboarding Guide */}
      {showGuide && !isSimulating && (
        <MenuOnboardingGuide
          menu="mock"
          lang={lang}
          onDismiss={() => setShowGuide(false)}
          onStartGlobalTour={onBackToDashboard}
        />
      )}

      {/* ACTIVE SIMULATION STUDIO (If currently in session) */}
      {isSimulating ? (
        <div className="bg-[#0B1528] rounded-3xl border border-slate-800 p-6 md:p-8 text-white shadow-2xl space-y-6">
          {/* Studio Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF7A00] flex items-center justify-center text-white font-bold">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{currentTarget.jobTitle}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-[#FF7A00] text-[10px] font-bold uppercase border border-orange-500/30">
                    {currentTarget.company}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Question {currentQuestionIndex + 1} sur {questions.length} • {currentQ.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <Clock className="w-4 h-4 text-[#FF7A00]" />
                <span className="font-mono text-sm font-bold text-slate-200">
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Mode badge */}
              <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#FF7A00]" />
                Audio Pro
              </span>

              <button
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setIsSimulating(false);
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Quitter
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#FF7A00] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Recruiter Avatar & Question Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* AI Recruiter Voice Wave Area (4 cols) */}
            <div className="lg:col-span-4 bg-[#111E33] border border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[260px]">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF7A00] to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                  <UserCheck className="w-10 h-10" />
                </div>
                {isSpeechSpeaking && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">ForPro AI Coach</h4>
                <p className="text-[11px] text-slate-400">
                  {isSpeechSpeaking ? 'En train de poser la question...' : 'À votre écoute'}
                </p>
              </div>

              {/* Dynamic Audio Equalizer Bars */}
              <div className="flex items-center gap-1.5 h-10">
                {audioWaves.map((height, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-[#FF7A00] rounded-full transition-all duration-150"
                    style={{ height: `${isSpeechSpeaking || isMicActive ? height : 12}%` }}
                  />
                ))}
              </div>

              {/* Read Aloud Trigger */}
              <button
                type="button"
                onClick={speakCurrentQuestion}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#FF7A00]" />
                <span>{lang === 'fr' ? 'Réécouter la question' : 'Replay question'}</span>
              </button>
            </div>

            {/* Question Text & Candidate Answer Workspace (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Question card */}
              <div className="bg-[#132238] border border-slate-700 p-5 rounded-2xl">
                <span className="text-[10px] font-bold text-[#FF7A00] uppercase tracking-wider">
                  {simLanguage === 'fr' ? 'Question de l\'évaluateur' : 'Interviewer Question'}
                </span>
                <p className="text-base font-semibold text-white mt-1 leading-relaxed">
                  {simLanguage === 'fr' ? currentQ.questionFr : currentQ.questionEn}
                </p>
              </div>

              {/* Candidate Response Workspace */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>{lang === 'fr' ? 'Votre réponse (Audio ou Écrite)' : 'Your Answer (Audio or Text)'}</span>
                    {isMicActive && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Microphone actif
                      </span>
                    )}
                  </label>

                  {/* Audio Record Button */}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isMicActive
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-md shadow-red-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isMicActive ? (
                      <>
                        <StopCircle className="w-4 h-4" />
                        <span>Arrêter l'enregistrement</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Activer le micro (Parler)</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder={
                    simLanguage === 'fr'
                      ? 'Parlez dans votre micro ou saisissez votre argumentation technique ici... (utilisez la méthode STAR)'
                      : 'Speak into your microphone or type your technical argument here... (use the STAR method)'
                  }
                  className="w-full bg-[#0E1B2E] border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/40 focus:border-[#FF7A00] leading-relaxed resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400">
                  {currentQuestionIndex === questions.length - 1
                    ? 'Dernière question • Cliquez pour générer le rapport IA'
                    : 'Passez à la question suivante dès que votre réponse est prête'}
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isEvaluating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{lang === 'fr' ? 'Évaluation IA en cours...' : 'AI Evaluation...'}</span>
                    </>
                  ) : currentQuestionIndex === questions.length - 1 ? (
                    <>
                      <Award className="w-4 h-4" />
                      <span>{lang === 'fr' ? 'Terminer & Obtenir le Diagnostic' : 'Finish & Get Diagnostic'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'fr' ? 'Question Suivante' : 'Next Question'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* FINAL EVALUATION REPORT MODAL / DRAWER */}
          {evaluationResult && (
            <div className="mt-6 bg-[#0E1B2E] border-2 border-emerald-500/50 rounded-2xl p-6 text-white space-y-5 animate-in fade-in">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                    Rapport de Performance IA
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">Simulation Terminée avec Succès</h3>
                  <p className="text-xs text-slate-400">
                    Poste : {currentTarget.jobTitle} • {currentTarget.company}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center bg-[#132238] px-4 py-2 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Score Global</p>
                    <p className="text-2xl font-black text-[#FF7A00]">{evaluationResult.score}%</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-center">
                <div className="bg-[#132238] p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Clarté & Structuration STAR</p>
                  <p className="text-base font-bold text-emerald-400">{evaluationResult.clarityScore}%</p>
                </div>
                <div className="bg-[#132238] p-3 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Profondeur Technique</p>
                  <p className="text-base font-bold text-cyan-400">{evaluationResult.depthScore}%</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#132238] p-3.5 rounded-xl border border-slate-700">
                {evaluationResult.feedback}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-950/30 border border-emerald-800/40 p-3.5 rounded-xl">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Points Forts Détectés
                  </h5>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {evaluationResult.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-950/30 border border-amber-800/40 p-3.5 rounded-xl">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Axes d'Amélioration
                  </h5>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {evaluationResult.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsSimulating(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Fermer & Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN DASHBOARD: Direct Offer Upload + Recent Matching History + Past Sessions */
        <div className="space-y-8">
          {/* TOP ACTION ROW: Direct Upload Offer Card */}
          <div className="bg-gradient-to-br from-[#0B1528] to-[#132238] rounded-3xl p-6 text-white border border-slate-800 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-[#FF7A00] border border-orange-500/30 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulation Directe & Immédiate</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {lang === 'fr'
                    ? 'Téléverser directement une offre pour simuler'
                    : 'Directly Upload a Job Offer for Simulation'}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'fr'
                    ? 'Vous avez une fiche de poste sous la main ? Chargez le fichier (PDF/Word) ou collez le lien pour lancer instantanément un entretien vocal adapté.'
                    : 'Got a job offer file or link? Upload it directly to start an instant tailored voice simulation.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setIsDirectUploadOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'fr' ? 'Uploader une offre directement' : 'Upload Offer Directly'}</span>
                </button>
              </div>
            </div>

            {/* DIRECT UPLOAD MODAL / ACCORDION */}
            {isDirectUploadOpen && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'fr' ? 'Configuration de l\'offre à simuler' : 'Offer configuration'}
                  </h3>
                  <button
                    onClick={() => setIsDirectUploadOpen(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectSource('file')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      directSource === 'file' ? 'border-[#FF7A00] bg-orange-500/10 text-white' : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold">Fichier PDF / Word</p>
                    <p className="text-[10px] text-slate-400">Glisser le document</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectSource('url')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      directSource === 'url' ? 'border-[#FF7A00] bg-orange-500/10 text-white' : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold">Lien Web de l'offre</p>
                    <p className="text-[10px] text-slate-400">URL LinkedIn, WTTJ...</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectSource('text')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      directSource === 'text' ? 'border-[#FF7A00] bg-orange-500/10 text-white' : 'border-slate-700 text-slate-400'
                    }`}
                  >
                    <p className="text-xs font-bold">Copier / Coller texte</p>
                    <p className="text-[10px] text-slate-400">Description brute</p>
                  </button>
                </div>

                {directSource === 'file' && (
                  <div className="border border-dashed border-slate-700 rounded-xl p-5 text-center bg-slate-900/60">
                    <input
                      type="file"
                      id="direct-offer-file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setDirectFileName(file.name);
                          if (!directJobTitle) {
                            setDirectJobTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                          }
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="direct-offer-file" className="cursor-pointer block">
                      <Upload className="w-6 h-6 text-[#FF7A00] mx-auto mb-2" />
                      <p className="text-xs font-bold text-white">
                        {directFileName || 'Cliquez pour sélectionner le fichier PDF ou Word (.docx)'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Formats .pdf, .docx, .doc jusqu'à 10MB</p>
                    </label>
                  </div>
                )}

                {directSource === 'url' && (
                  <input
                    type="url"
                    placeholder="https://company.com/careers/lead-architect..."
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                  />
                )}

                {directSource === 'text' && (
                  <textarea
                    rows={3}
                    placeholder="Collez ici la description du poste..."
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Intitulé du poste (ex: Lead Platform Architect)"
                    value={directJobTitle}
                    onChange={(e) => setDirectJobTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                  />
                  <input
                    type="text"
                    placeholder="Entreprise (ex: Wave, Paystack...)"
                    value={directCompany}
                    onChange={(e) => setDirectCompany(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLaunchDirectUpload}
                  className="w-full py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Démarrer la simulation pour cette offre →
                </button>
              </div>
            )}
          </div>

          {/* SECTION 1: RECENT MATCHES HISTORY (CRITICAL REQUIREMENT) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'fr' ? 'Historique récent de vos matchings' : 'Recent Matching History'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'fr'
                    ? 'Sélectionnez une offre matchée pour lancer un entretien audio ciblé (Option Pro).'
                    : 'Click any matched offer to simulate a tailored audio interview (Pro Option).'}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {matchesHistory.length} {lang === 'fr' ? 'offres enregistrées' : 'offers recorded'}
              </span>
            </div>

            {matchesHistory.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {lang === 'fr' ? 'Aucun matching récent' : 'No recent match'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'fr'
                    ? 'Évaluez d\'abord un CV dans la section "Job Matching" ou uploadez directement une offre ci-dessus.'
                    : 'Evaluate a CV in Job Matching first or upload an offer directly above.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchesHistory.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#FF7A00] uppercase tracking-wider">
                            {match.company}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">{match.jobTitle}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            CV : {match.cvName} • {match.date}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            {match.matchScore}% Match
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {match.summary}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Crown className="w-3.5 h-3.5 text-[#FF7A00]" />
                        <span>Entretien Audio</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleStartSimulation({
                            jobTitle: match.jobTitle,
                            company: match.company,
                            matchId: match.id,
                          })
                        }
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5 text-[#FF7A00] group-hover:text-white" />
                        <span>{lang === 'fr' ? 'Simuler entretien audio' : 'Simulate Audio'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: PAST INTERVIEW SESSIONS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'fr' ? 'Historique de vos simulations passées' : 'Past Mock Interview Sessions'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'fr'
                    ? 'Consultez vos diagnostics passés, notes de clarté et axes de progression recommandés.'
                    : 'Review previous AI evaluations, clarity scores, and actionable feedback.'}
                </p>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="p-8 sm:p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-[#FF7A00]">
                  <Video className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    {lang === 'fr' ? 'Aucune simulation enregistrée pour le moment' : 'No mock interview sessions yet'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {lang === 'fr'
                      ? 'Vos enregistrements vocaux, scores de clarté STAR, transcriptions et synthèses d\'évaluateur s\'afficheront ici après votre premier entraînement.'
                      : 'Your voice recordings, STAR clarity scores, transcripts, and evaluator summaries will appear here after your first practice session.'}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDirectUploadOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B1528] hover:bg-[#FF7A00] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
                    <span>{lang === 'fr' ? 'Lancer ma première simulation vocale' : 'Launch My First Mock Interview'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="pb-2.5 font-bold">Poste & Entreprise</th>
                      <th className="pb-2.5 font-bold">Date & Durée</th>
                      <th className="pb-2.5 font-bold">Mode & Langue</th>
                      <th className="pb-2.5 font-bold">Score Global</th>
                      <th className="pb-2.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 font-semibold text-slate-900">
                          <div>
                            <p className="text-xs font-bold">{sess.jobTitle}</p>
                            <p className="text-[11px] text-slate-500">{sess.company}</p>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500">
                          {sess.date} ({sess.duration})
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                            {sess.mode} • {sess.language}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-black text-slate-900">{sess.score}%</span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setActiveSessionReview(sess)}
                            className="text-xs font-bold text-[#FF7A00] hover:underline"
                          >
                            Voir le rapport
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESSION REVIEW MODAL */}
      {activeSessionReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeSessionReview.jobTitle}</h3>
                <p className="text-xs text-slate-500">
                  {activeSessionReview.company} • {activeSessionReview.date}
                </p>
              </div>
              <span className="text-lg font-black text-[#FF7A00]">{activeSessionReview.score}%</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
              {activeSessionReview.feedback}
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-emerald-800">Points forts</h5>
              <ul className="text-xs text-slate-600 space-y-1">
                {activeSessionReview.strengths.map((st, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-amber-800">Recommandations</h5>
              <ul className="text-xs text-slate-600 space-y-1">
                {activeSessionReview.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSessionReview(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
