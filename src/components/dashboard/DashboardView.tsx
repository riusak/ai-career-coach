'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { DashboardViewData, CvDetailData, MilestoneData } from '@/types/dashboard';
import type { CvSummaryData } from '@/types/dashboard';
import { completeOnboardingAction } from '@/app/dashboard/onboarding-actions';
import { flashUploadResumeAction } from '@/app/dashboard/resume/actions';
import { setPendingCvUploadFile } from '@/lib/pending-cv-upload';
import QuickActions from '@/components/dashboard/QuickActions';
import CareerRoadmap from '@/components/dashboard/CareerRoadmap';
import ProfileOverview from '@/components/dashboard/ProfileOverview';
import CVSection from '@/components/dashboard/CVSection';
import RecentActivity from '@/components/dashboard/RecentActivity';
import CVPreviewModal from '@/components/dashboard/CVPreviewModal';
import AnalyseCvQuickModal from '@/components/dashboard/AnalyseCvQuickModal';
import MilestoneModal from '@/components/dashboard/MilestoneModal';
import JobMatchModal from '@/app/dashboard/matching/JobMatchModal';
import MockInterviewQuickModal from '@/components/dashboard/MockInterviewQuickModal';
import FirstLoginWelcomeModal from '@/components/dashboard/onboarding/FirstLoginWelcomeModal';
import HowItWorksModal from '@/components/dashboard/onboarding/HowItWorksModal';
import ProductTour from '@/components/dashboard/onboarding/ProductTour';

interface DashboardViewProps {
  data: DashboardViewData;
  /** Full name of the authenticated user (used by the welcome modal). */
  userName: string;
  /** True on the first connection, before the onboarding cookie is set. */
  showOnboarding: boolean;
}

/**
 * Client root of the « Career Dashboard » — the Next.js equivalent of the
 * template's dashboard tab in App.tsx. Renders the three layout rows exactly
 * as defined by the template: Quick Actions, Career Progression + Profile
 * Overview, and CVs + Recent Activity. All data arrives precomputed from the
 * server component; this layer only owns UI state plus the quick-action
 * flows (flash upload, ATS diagnostic, matching & mock quick modals).
 */
export default function DashboardView({ data, userName, showOnboarding }: DashboardViewProps) {
  const locale = useLocale();
  const router = useRouter();
  const [previewCvId, setPreviewCvId] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<'preview' | 'analysis' | 'services'>('preview');
  /** Opens the preview modal with an automatic fresh analysis queue + poll. */
  const [autoQueueAnalysis, setAutoQueueAnalysis] = useState(false);
  /** Client-side stand-in for a CV flash-uploaded during this session. */
  const [flashCv, setFlashCv] = useState<CvDetailData | null>(null);
  const [isFlashUploading, setIsFlashUploading] = useState(false);
  const [analyseModalOpen, setAnalyseModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(showOnboarding);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  const primaryCv = data.cvs.find((cv) => cv.isPrimary) ?? data.cvs[0] ?? null;
  const previewCv =
    data.cvs.find((cv) => cv.id === previewCvId) ??
    (flashCv && flashCv.id === previewCvId ? flashCv : null);
  /** Light summaries for the quick modals (JobMatchModal / mock modal). */
  const cvSummaries: CvSummaryData[] = data.cvs.map((cv) => ({
    id: cv.id,
    name: cv.name,
    label: cv.label,
    isPrimary: cv.isPrimary,
    createdAt: cv.createdAt,
    score: cv.score,
    hasAnalysis: cv.score !== null,
  }));
  const primaryCvId = primaryCv?.id ?? null;

  /**
   * Card 1 « Téléverser un nouveau CV » — flash file picker: the picked file
   * is parked client-side and the user is redirected to /dashboard/cvs where
   * the standard upload form is primed with it.
   */
  const handleUploadFileSelected = (file: File) => {
    setPendingCvUploadFile(file);
    router.push('/dashboard/cvs#upload');
  };

  /**
   * Card 2 « Analyser mon CV » — opens the « Aperçu » selector modal. No CV
   * is pre-selected: the user explicitly picks one from the list.
   */
  const handleAnalyseCv = () => {
    setAnalyseModalOpen(true);
  };

  /** Opens the preview of an existing CV picked in the selector modal. */
  const handleSelectCvForAnalyse = (cv: CvDetailData) => {
    setAnalyseModalOpen(false);
    setInitialTab('preview');
    setAutoQueueAnalysis(false);
    setPreviewCvId(cv.id);
  };

  /**
   * Flash upload inside the selector modal — uploads the picked file through
   * the standard secured pipeline (no redirect), then opens its preview
   * immediately as a temporary document.
   */
  const handleAnalyseFlashUpload = async (file: File) => {
    setIsFlashUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const result = await flashUploadResumeAction(formData);
      if (result.error || !result.resumeId) {
        return;
      }
      const uploaded: CvDetailData = {
        id: result.resumeId,
        name: result.fileName ?? file.name,
        label: null,
        isPrimary: false,
        createdAt: new Date().toISOString(),
        score: null,
        subscores: null,
        summary: null,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        rawText: null,
        rawTextTruncated: false,
        wordCount: null,
      };
      setFlashCv(uploaded);
      setAnalyseModalOpen(false);
      setInitialTab('preview');
      setAutoQueueAnalysis(false);
      setPreviewCvId(uploaded.id);
      // Sync the server-rendered lists (recent activity, CV count…).
      router.refresh();
    } finally {
      setIsFlashUploading(false);
    }
  };

  const closeOnboarding = () => {
    setOnboardingOpen(false);
    setHowItWorksOpen(false);
    void completeOnboardingAction();
  };

  const startTour = () => {
    setOnboardingOpen(false);
    setHowItWorksOpen(false);
    setTourActive(true);
  };

  const endTour = () => {
    setTourActive(false);
    void completeOnboardingAction();
  };

  return (
    <>
      {/* Row 1 — Quick Actions */}
      <QuickActions
        isFlashUploading={isFlashUploading}
        onUploadFileSelected={handleUploadFileSelected}
        onAnalyseCv={handleAnalyseCv}
        onMatchJobs={() => setMatchModalOpen(true)}
        onMockInterview={() => setMockModalOpen(true)}
      />

      {/* Row 2 — Career Progression + Profile Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 items-stretch">
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col">
          <CareerRoadmap
            isEmpty={data.isEmptyState}
            milestones={data.milestones}
            onSelectMilestone={(milestone) => setSelectedMilestone(milestone)}
            onAddExperience={() => router.push('/dashboard/profile')}
            onViewFullRoadmap={() => router.push('/dashboard/timeline')}
          />
        </div>
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col">
          <ProfileOverview
            score={data.profileStrength}
            isEmpty={data.isEmptyState}
            metrics={data.metrics}
          />
        </div>
      </div>

      {/* Row 3 — Your CVs (8 cols) + Recent Activity (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <CVSection
            cvs={data.cvs}
            onOpenCv={(cv) => {
              setInitialTab('preview');
              setPreviewCvId(cv.id);
            }}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <RecentActivity activities={data.activities} />
        </div>
      </div>

      {previewCv && (
        <CVPreviewModal
          key={previewCv.id}
          cv={previewCv}
          initialTab={initialTab}
          autoQueueAnalysis={autoQueueAnalysis}
          onClose={() => {
            setPreviewCvId(null);
            setAutoQueueAnalysis(false);
          }}
        />
      )}

      {/* Quick-access « Aperçu » modal (card 2) — the user must pick a CV
          (no default selection); a flash upload previews a temp document. */}
      <AnalyseCvQuickModal
        open={analyseModalOpen}
        onClose={() => setAnalyseModalOpen(false)}
        cvs={data.cvs}
        onSelectCv={handleSelectCvForAnalyse}
        onFlashUploadFile={(file) => void handleAnalyseFlashUpload(file)}
        isUploading={isFlashUploading}
      />

      {/* Quick-access matching modal (card 4) — queues the matching then
          redirects to the dedicated /dashboard/matching page for results. */}
      <JobMatchModal
        open={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        cvs={cvSummaries}
        initialResumeId={primaryCvId}
        redirectOnQueue
      />

      {/* Quick-access mock-interview modal (card 5) — consistency with the
          matching card; redirects to /dashboard/mock with the context. */}
      <MockInterviewQuickModal
        open={mockModalOpen}
        onClose={() => setMockModalOpen(false)}
        cvs={cvSummaries}
        initialResumeId={primaryCvId}
      />

      <MilestoneModal
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        locale={locale}
      />

      {/* First-connection onboarding (cookie-persisted, no localStorage). */}
      <FirstLoginWelcomeModal
        isOpen={onboardingOpen}
        userName={userName}
        onClose={closeOnboarding}
        onStartTour={startTour}
        onShowHowItWorks={() => setHowItWorksOpen(true)}
      />

      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onGetStarted={() => {
          setHowItWorksOpen(false);
          setOnboardingOpen(false);
          void completeOnboardingAction();
          router.push('/dashboard/profile');
        }}
      />

      <ProductTour isActive={tourActive} onComplete={endTour} onSkip={endTour} />

      {/* Screen-reader announcement of the current dashboard state. */}
      <p className="sr-only" aria-live="polite">
        {data.isEmptyState ? 'No activity yet' : 'Dashboard'}
      </p>
    </>
  );
}