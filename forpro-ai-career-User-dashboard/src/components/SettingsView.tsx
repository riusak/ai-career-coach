import React, { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Globe,
  Shield,
  CreditCard,
  Check,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Save,
  Download,
  Trash2,
  Crown,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import { UserProfile } from '../types';
import { MenuOnboardingGuide } from './MenuOnboardingGuide';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onBackToDashboard: () => void;
  onUpgradeClick: () => void;
  lang: 'en' | 'fr';
  setLang: (lang: 'en' | 'fr') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onBackToDashboard,
  onUpgradeClick,
  lang,
  setLang,
}) => {
  const isFrench = lang === 'fr';

  // Local Form state
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('+228 90 12 34 56');
  const [location, setLocation] = useState('Lomé, Togo');
  const [bio, setBio] = useState(
    'Senior Software Engineer with 8+ years experience architecting high-throughput distributed microservices, telecom payment bridges, and cloud-native systems.'
  );

  // Preferences
  const [coachTone, setCoachTone] = useState<'strict' | 'supportive'>('strict');
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'XOF'>('EUR');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [anonymizeMatching, setAnonymizeMatching] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name,
      title,
      email,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleExportData = () => {
    const data = {
      profile: { name, title, email, phone, location, bio },
      settings: { coachTone, currency, emailAlerts, weeklyDigest, anonymizeMatching },
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forpro-profile-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left max-w-4xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isFrench ? 'Retour au tableau de bord' : 'Back to Dashboard'}</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>ForPro</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-900 font-bold">
              {isFrench ? 'Paramètres & Profil' : 'Settings & Preferences'}
            </span>
          </div>
        </div>

        <button
          id="settings-guide-btn"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/90 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          title={isFrench ? 'Afficher ou masquer le guide de prise en main' : 'Toggle page guide'}
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>{showGuide ? (isFrench ? 'Masquer guide' : 'Hide guide') : (isFrench ? '💡 Guide' : '💡 Guide')}</span>
        </button>
      </div>

      {/* Dedicated Contextual Onboarding Guide */}
      {showGuide && (
        <MenuOnboardingGuide
          menu="settings"
          lang={lang}
          onDismiss={() => setShowGuide(false)}
          onStartGlobalTour={onBackToDashboard}
        />
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Profil Professionnel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {isFrench ? 'Informations du Profil' : 'Personal & Profile Information'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFrench ? 'Ces informations sont utilisées pour le matching et vos CVs' : 'Used for job matching and your CV profile'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Nom Complet' : 'Full Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Titre Professionnel Actuel' : 'Professional Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Téléphone' : 'Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Localisation' : 'Location'}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#FF7A00]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Résumé Exécutif / Bio' : 'Executive Summary / Bio'}
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium leading-relaxed focus:outline-none focus:border-[#FF7A00]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Préférences IA & Tonalité */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {isFrench ? 'Intelligence Artificielle & Coaching' : 'AI Engine & Coaching Tone'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFrench ? 'Personnalisez le niveau d’exigence de votre entraîneur IA' : 'Tune the feedback strictness of your AI examiner'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Tonalité des Évaluations' : 'Evaluation Persona'}
              </label>
              <select
                value={coachTone}
                onChange={(e) => setCoachTone(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF7A00] cursor-pointer"
              >
                <option value="strict">
                  {isFrench ? 'Exigeant & Direct (Standard FAANG / Staff)' : 'Strict & Direct (FAANG Rubric)'}
                </option>
                <option value="supportive">
                  {isFrench ? 'Bienveillant & Pédagogue' : 'Supportive & Pedagogical'}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Modèle IA Actif' : 'Underlying AI Model'}
              </label>
              <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
                <span>Gemini 2.5 Flash</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  Actif
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Langue, Devise & Notifications */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {isFrench ? 'Langue & Devise' : 'Language & Localization'}
              </h3>
              <p className="text-xs text-slate-400">
                {isFrench ? 'Langue d’interface et format d’affichage des salaires' : 'Display language and preferred currency'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Langue de l’application' : 'Interface Language'}
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF7A00] cursor-pointer"
              >
                <option value="fr">Français (France / Afrique)</option>
                <option value="en">English (US / Global)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isFrench ? 'Devise pour les benchmarks salariaux' : 'Benchmark Currency'}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF7A00] cursor-pointer"
              >
                <option value="EUR">Euros (€ - EUR)</option>
                <option value="USD">US Dollars ($ - USD)</option>
                <option value="XOF">Francs CFA (FCFA - XOF)</option>
              </select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {isFrench ? 'Alertes Nouvelles Offres (>90% match)' : 'Alert on High Job Matches (>90%)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isFrench ? 'Recevoir un email dès qu’un poste Staff correspond' : 'Instant email alert when a role matches'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#FF7A00] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {isFrench ? 'Anonymiser mon CV lors du premier contact' : 'Anonymize resume in initial recruiter screening'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isFrench ? 'Masquer nom et coordonnées tant que vous n’avez pas validé' : 'Protect privacy until mutual interest'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={anonymizeMatching}
                onChange={(e) => setAnonymizeMatching(e.target.checked)}
                className="w-4 h-4 accent-[#FF7A00] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Section 4: Abonnement & Données */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isFrench ? 'Abonnement & Plan Actuel' : 'Subscription Plan'}
                </h3>
                <p className="text-xs text-slate-400">{user.plan || 'Free Plan'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onUpgradeClick}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              {isFrench ? 'Passer à ForPro Pro' : 'Upgrade to Pro'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={handleExportData}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isFrench ? 'Exporter mes données (JSON)' : 'Export My Data'}</span>
            </button>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>{isFrench ? 'Modifications enregistrées !' : 'Saved successfully!'}</span>
            </span>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#FF7A00] hover:bg-[#E66E00] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isFrench ? 'Enregistrer les paramètres' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
