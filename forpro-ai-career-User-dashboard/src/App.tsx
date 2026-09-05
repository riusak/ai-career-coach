import React, { useState } from 'react';
import {
  activeUser,
  emptyUser,
  activeMilestones,
  activeCVs,
  activeActivities,
} from './data/mockData';
import { CareerMilestone, CVDocument, UserProfile, JobOfferMatch } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { CareerRoadmap } from './components/CareerRoadmap';
import { ProfileOverview } from './components/ProfileOverview';
import { CVSection } from './components/CVSection';
import { RecentActivity } from './components/RecentActivity';
import { AddExperienceModal } from './components/AddExperienceModal';
import { MilestoneModal } from './components/MilestoneModal';
import { UploadCVModal } from './components/UploadCVModal';
import { UpgradeModal } from './components/UpgradeModal';
import { JobMatchModal } from './components/JobMatchModal';
import { HowItWorksModal } from './components/HowItWorksModal';
import { MockInterviewModal } from './components/MockInterviewModal';
import { FullRoadmapView } from './components/FullRoadmapView';
import { MyCVsView } from './components/MyCVsView';
import { JobMatchingView } from './components/JobMatchingView';
import { MockInterviewsView } from './components/MockInterviewsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { CVPreviewModal } from './components/CVPreviewModal';
import { FirstLoginWelcomeModal } from './components/FirstLoginWelcomeModal';
import { ProductTour } from './components/ProductTour';
import { getStoredCVs, setPrimaryCV, deleteCV, addUploadedCV } from './utils/cvStorage';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [isEmptyState, setIsEmptyState] = useState(true);
  const [lang, setLang] = useState<'en' | 'fr'>('fr');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // First Login Onboarding & Interactive Product Tour
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);

  // Dynamic Data States
  const [user, setUser] = useState<UserProfile>(emptyUser);
  const [milestones, setMilestones] = useState<CareerMilestone[]>([]);
  const [cvs, setCvs] = useState<CVDocument[]>([]);
  const [selectedCVForPreview, setSelectedCVForPreview] = useState<CVDocument | null>(null);
  const [targetMatchForMock, setTargetMatchForMock] = useState<JobOfferMatch | null>(null);

  // Modals
  const [isAddExpOpen, setIsAddExpOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<CareerMilestone | null>(null);
  const [isUploadCVOpen, setIsUploadCVOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isJobMatchOpen, setIsJobMatchOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isMockInterviewOpen, setIsMockInterviewOpen] = useState(false);

  const handleNavSelect = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const toggleState = () => {
    if (isEmptyState) {
      setIsEmptyState(false);
      setUser(activeUser);
      setMilestones(activeMilestones);
      setCvs(activeCVs);
    } else {
      setIsEmptyState(true);
      setUser(emptyUser);
      setMilestones([]);
      setCvs([]);
    }
  };

  const handleStartTourSimulation = () => {
    setIsEmptyState(true);
    setUser(emptyUser);
    setMilestones([]);
    setCvs([]);
    setActiveTab('dashboard');
    setIsWelcomeModalOpen(true);
  };

  const handleAddExperience = (newExp: Partial<CareerMilestone>) => {
    const created: CareerMilestone = {
      id: `m-${Date.now()}`,
      year: newExp.year || '2024',
      yearRange: newExp.yearRange || '2024 - Present',
      role: newExp.role || 'Software Engineer',
      company: newExp.company || 'Tech Corp',
      description: newExp.description || 'Contributed to high-impact products.',
      keyMissions: newExp.keyMissions || ['Led core engineering deliverables', 'Optimized database architecture'],
      technologies: newExp.technologies && newExp.technologies.length > 0 ? newExp.technologies : ['TypeScript', 'Node.js', 'PostgreSQL'],
      domain: newExp.domain || 'backend',
      isCurrent: true,
    };

    if (isEmptyState) {
      setIsEmptyState(false);
      setUser({
        ...activeUser,
        profileStrength: 40,
        totalYearsExp: 2.5,
        isEmptyState: false,
      });
      setMilestones([
        created,
        {
          id: 'goal-target',
          year: 'Goal',
          yearRange: 'Summit Target',
          role: 'Lead Architect',
          company: 'Visionary Peak',
          description: 'Driving architecture vision and technical excellence.',
          keyMissions: [
            'Architect scalable cloud-native microservices',
            'Sponsor engineering excellence across the organization'
          ],
          technologies: ['Distributed Systems', 'Cloud Architecture', 'Leadership'],
          isGoal: true,
          domain: 'architecture'
        }
      ]);
    } else {
      setMilestones((prev) => [created, ...prev]);
    }
  };

  const handleLoadDemo = () => {
    setIsEmptyState(false);
    setUser(activeUser);
    setMilestones(activeMilestones);
    setCvs(activeCVs);
  };

  const handleCVUploaded = (newCV: CVDocument) => {
    setCvs((prev) => {
      const updated = [newCV, ...prev];
      return updated;
    });
    setSelectedCVForPreview(newCV);
    if (isEmptyState) {
      setIsEmptyState(false);
      setUser(activeUser);
      setMilestones(activeMilestones);
    }
  };

  const handleSetPrimaryCV = (cvId: string) => {
    const updated = setPrimaryCV(cvId, cvs);
    setCvs(updated);
  };

  const handleDeleteCV = (cvId: string) => {
    const updated = deleteCV(cvId, cvs);
    setCvs(updated);
    if (selectedCVForPreview?.id === cvId) {
      setSelectedCVForPreview(null);
    }
  };

  const handleUploadCVFile = (file: File) => {
    const { updatedList, newCV } = addUploadedCV(file, cvs);
    setCvs(updatedList);
    setSelectedCVForPreview(newCV);
    if (isEmptyState) {
      setIsEmptyState(false);
      setUser(activeUser);
      setMilestones(activeMilestones);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden antialiased font-sans">
      {/* Mobile Hamburger Toggle */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="lg:hidden fixed bottom-5 right-5 z-50 p-3 rounded-full bg-[#0B1528] text-white shadow-xl border border-slate-700 font-bold cursor-pointer"
        aria-label="Toggle Menu"
      >
        {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <div
        className={`${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed inset-y-0 left-0 z-40 w-60 h-screen transition-transform duration-200 ease-in-out`}
      >
        <Sidebar
          user={user}
          activeTab={activeTab}
          setActiveTab={handleNavSelect}
          onUpgradeClick={() => setIsUpgradeOpen(true)}
          onProfileClick={() => setActiveTab('settings')}
          onToggleState={toggleState}
          onStartTourSimulation={handleStartTourSimulation}
        />
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Canvas Area */}
      <div className="lg:pl-60 flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[#F8FAFC]">
        {/* Header */}
        <Header
          user={user}
          lang={lang}
          setLang={setLang}
          onToggleState={toggleState}
          onUpgradeClick={() => setIsUpgradeOpen(true)}
          onAddExperienceClick={() => setIsAddExpOpen(true)}
          onNotificationClick={() => {}}
          onStartTourSimulation={handleStartTourSimulation}
        />

        {/* Canvas Content Container */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-12 pt-3 sm:pt-4 flex flex-col gap-6 sm:gap-7 lg:gap-8 max-w-[1600px] w-full mx-auto">
          {activeTab === 'timeline' ? (
            <FullRoadmapView
              milestones={milestones}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onSelectMilestone={(m) => setSelectedMilestone(m)}
              onAddExperience={() => setIsAddExpOpen(true)}
              lang={lang}
            />
          ) : activeTab === 'cvs' ? (
            <MyCVsView
              cvs={cvs}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onUploadCV={handleUploadCVFile}
              onSetPrimaryCV={handleSetPrimaryCV}
              onDeleteCV={handleDeleteCV}
              onAnalyzeCV={(cv) => setSelectedCVForPreview(cv)}
              onMatchJobs={(cv) => setActiveTab('matching')}
              onMockInterview={(cv) => setActiveTab('mock')}
              lang={lang}
            />
          ) : activeTab === 'matching' ? (
            <JobMatchingView
              cvs={cvs}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onMockInterviewForJob={(match) => {
                setTargetMatchForMock(match);
                setActiveTab('mock');
              }}
              onViewCV={(cv) => setSelectedCVForPreview(cv)}
              lang={lang}
            />
          ) : activeTab === 'mock' ? (
            <MockInterviewsView
              user={user}
              initialMatch={targetMatchForMock}
              onClearInitialMatch={() => setTargetMatchForMock(null)}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onUpgradeClick={() => setIsUpgradeOpen(true)}
              lang={lang}
              isEmpty={isEmptyState}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsView
              onBackToDashboard={() => setActiveTab('dashboard')}
              lang={lang}
              isEmpty={isEmptyState}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : activeTab === 'settings' ? (
            <SettingsView
              user={user}
              onUpdateUser={(updated) => setUser((prev) => ({ ...prev, ...updated }))}
              onBackToDashboard={() => setActiveTab('dashboard')}
              onUpgradeClick={() => setIsUpgradeOpen(true)}
              lang={lang}
              setLang={setLang}
            />
          ) : (
            <>
              {/* Row 1: Quick Actions Row */}
              <QuickActions
                onUploadCV={() => setIsUploadCVOpen(true)}
                onAnalyseCV={() => {
                  if (cvs.length > 0) {
                    const primary = cvs.find((c) => c.isPrimary) || cvs[0];
                    setSelectedCVForPreview(primary);
                  } else {
                    setIsUploadCVOpen(true);
                  }
                }}
                onMatchJobs={() => setActiveTab('matching')}
                onMockInterview={() => setActiveTab('mock')}
                lang={lang}
              />

              {/* Row 2: Middle Row - Career Progression + Profile Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 items-stretch">
                <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col">
                  <CareerRoadmap
                    isEmpty={isEmptyState}
                    milestones={milestones}
                    onSelectMilestone={(m) => setSelectedMilestone(m)}
                    onAddExperience={() => setIsAddExpOpen(true)}
                    onViewFullRoadmap={() => setActiveTab('timeline')}
                    lang={lang}
                  />
                </div>
                <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col">
                  <ProfileOverview
                    score={user.profileStrength}
                    isEmpty={isEmptyState}
                    onCompleteProfile={() => setIsAddExpOpen(true)}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Row 3: Bottom Row - Your CVs (8 cols) + Recent Activity (4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 lg:gap-8 items-stretch">
                <div className="lg:col-span-8 flex flex-col">
                  <CVSection
                    cvs={cvs}
                    onUploadClick={() => setIsUploadCVOpen(true)}
                    onSelectCV={(cv) => setSelectedCVForPreview(cv)}
                    onViewAll={() => setActiveTab('cvs')}
                    lang={lang}
                  />
                </div>
                <div className="lg:col-span-4 flex flex-col">
                  <RecentActivity
                    activities={activeActivities}
                    lang={lang}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <AddExperienceModal
        isOpen={isAddExpOpen}
        onClose={() => setIsAddExpOpen(false)}
        onSave={handleAddExperience}
        onLoadDemo={handleLoadDemo}
        lang={lang}
      />

      <MilestoneModal
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
        lang={lang}
      />

      <UploadCVModal
        isOpen={isUploadCVOpen}
        onClose={() => setIsUploadCVOpen(false)}
        onUploadSuccess={handleCVUploaded}
        lang={lang}
      />

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        lang={lang}
      />

      <JobMatchModal
        isOpen={isJobMatchOpen}
        onClose={() => setIsJobMatchOpen(false)}
        lang={lang}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onGetStarted={() => setIsAddExpOpen(true)}
        lang={lang}
      />

      <MockInterviewModal
        isOpen={isMockInterviewOpen}
        onClose={() => setIsMockInterviewOpen(false)}
        lang={lang}
      />

      {/* Real Interactive CV Preview & Analysis Modal */}
      {selectedCVForPreview && (
        <CVPreviewModal
          cv={selectedCVForPreview}
          isOpen={!!selectedCVForPreview}
          onClose={() => setSelectedCVForPreview(null)}
          onSetPrimary={(id) => handleSetPrimaryCV(id)}
          onAnalyze={(cv) => setSelectedCVForPreview(cv)}
          onMatchJobs={(cv) => {
            setSelectedCVForPreview(null);
            setActiveTab('matching');
          }}
          onMockInterview={(cv) => {
            setSelectedCVForPreview(null);
            setActiveTab('mock');
          }}
          onDelete={(id) => handleDeleteCV(id)}
          lang={lang}
        />
      )}

      {/* First Connection Welcome Modal */}
      <FirstLoginWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onStartTour={() => {
          setIsWelcomeModalOpen(false);
          setIsTourActive(true);
        }}
        onNavigateTab={(tab) => {
          setIsWelcomeModalOpen(false);
          setActiveTab(tab);
        }}
        lang={lang}
        user={user}
        userName={user?.name}
      />

      {/* Interactive Spotlight Product Tour */}
      <ProductTour
        isActive={isTourActive}
        onComplete={() => setIsTourActive(false)}
        onSkip={() => setIsTourActive(false)}
        lang={lang}
      />
    </div>
  );
}
