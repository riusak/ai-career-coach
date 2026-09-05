// One-shot: merges the Phase 3 onboarding keys into the message files.
// Run: node scripts/merge-onboarding-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fr = {
  welcomeBadge: "Première Connexion",
  welcomeTitle: "Bienvenue, {name} !",
  welcomeSubtitle:
    "Ravi de vous compter parmi nous. Votre espace professionnel ForPro AI est configuré et prêt à l'emploi.",
  welcomeTourTitle: "Visite guidée de votre espace",
  welcomeTourDesc:
    "Nous allons parcourir ensemble les menus de votre espace pour vous expliquer comment il est constitué et ce que chaque outil vous permet d'accomplir.",
  welcomeStatMenus: "6 Repères",
  welcomeStatMenusLabel: "Expliqués en direct",
  welcomeStatTime: "< 1 min",
  welcomeStatTimeLabel: "Visite express",
  welcomeStatSteps: "Pas à pas",
  welcomeStatStepsLabel: "Sans quitter la page",
  welcomeClose: "Fermer",
  welcomeExplore: "Explorer librement",
  welcomeStartTour: "Commencer la visite",
  welcomeHowLink: "Voir comment ça marche",
  howKicker: "Méthodologie ForPro AI",
  howTitle: "Comment fonctionne ForPro AI ?",
  howSubtitle:
    "Trois étapes simples pour propulser votre carrière technique vers les rôles de direction.",
  howClose: "Fermer",
  howGetStarted: "Commencer maintenant",
  howStep1Title: "Renseignez votre parcours",
  howStep1Desc:
    "Téléversez votre CV existant ou ajoutez vos expériences pour générer instantanément votre roadmap ascendante.",
  howStep2Title: "Diagnostic IA & Comblement de Gap",
  howStep2Desc:
    "Nos modèles analysent vos compétences face aux standards Lead & Architect pour identifier les compétences manquantes.",
  howStep3Title: "Matching & Entraînement Technique",
  howStep3Desc:
    "Entraînez-vous sur des simulations d'entretien interactives et connectez-vous aux opportunités les plus prestigieuses.",
  tourSkip: "Passer",
  tourBack: "Précédent",
  tourNext: "Suivant",
  tourDone: "C'est parti !",
  tourStep1Title: "Tableau de bord",
  tourStep1Desc:
    "Votre vue synthétique : complétude du profil, actions rapides et activités récentes. C'est votre camp de base.",
  tourStep1Badge: "Menu 1/3",
  tourStep2Title: "Mes CVs",
  tourStep2Desc:
    "Votre coffre-fort documentaire : stockez vos CV, suivez votre note ATS, auditez vos mots-clés et téléchargez vos documents.",
  tourStep2Badge: "Menu 2/3",
  tourStep3Title: "Profil",
  tourStep3Desc:
    "Complétez votre identité, vos expériences, compétences et formations pour renforcer la force de votre profil.",
  tourStep3Badge: "Menu 3/3",
  tourStep4Title: "Actions rapides",
  tourStep4Desc:
    "Téléversez un CV, lancez un diagnostic IA, évaluez une offre d'emploi ou préparez un entretien en un clic.",
  tourStep4Badge: "Étape 4/7",
  tourStep5Title: "Aperçu du profil",
  tourStep5Desc:
    "Votre score global et vos indicateurs : compétences, expérience, formation, certifications et qualité CV.",
  tourStep5Badge: "Étape 5/7",
  tourStep6Title: "Vos CVs",
  tourStep6Desc:
    "Chaque carte affiche le score ATS de votre dernière analyse. Cliquez pour ouvrir l'aperçu et le diagnostic complet.",
  tourStep6Badge: "Étape 6/7",
  tourStep7Title: "Activité récente",
  tourStep7Desc:
    "Vos derniers mouvements : CV téléversés, analyses terminées, expériences et compétences ajoutées.",
  tourStep7Badge: "Étape 7/7",
};

const en = {
  welcomeBadge: "First Login",
  welcomeTitle: "Welcome, {name}!",
  welcomeSubtitle:
    "Delighted to have you with us. Your ForPro AI professional workspace is all set and ready to use.",
  welcomeTourTitle: "Guided workspace tour",
  welcomeTourDesc:
    "We will walk you through your workspace menus to show you how it is structured and how each tool supports your career progression.",
  welcomeStatMenus: "6 Landmarks",
  welcomeStatMenusLabel: "Explained live",
  welcomeStatTime: "< 1 min",
  welcomeStatTimeLabel: "Quick walkthrough",
  welcomeStatSteps: "Step by step",
  welcomeStatStepsLabel: "No page switch",
  welcomeClose: "Close",
  welcomeExplore: "Explore on my own",
  welcomeStartTour: "Start Workspace Tour",
  welcomeHowLink: "See how it works",
  howKicker: "ForPro AI Methodology",
  howTitle: "How does ForPro AI work?",
  howSubtitle:
    "Three deliberate steps engineered to accelerate your trajectory to engineering leadership.",
  howClose: "Close",
  howGetStarted: "Get Started Now",
  howStep1Title: "Map Your Experiences",
  howStep1Desc:
    "Upload your current resume or manually add your milestone roles to generate your ascending career path.",
  howStep2Title: "AI Diagnostic & Gap Analysis",
  howStep2Desc:
    "Our AI compares your stack against Lead & Architect expectations to highlight high-leverage growth areas.",
  howStep3Title: "Smart Matching & Drill Simulations",
  howStep3Desc:
    "Simulate system design mock interviews with real-time feedback and get matched to high-impact leadership roles.",
  tourSkip: "Skip",
  tourBack: "Back",
  tourNext: "Next",
  tourDone: "Get Started",
  tourStep1Title: "Dashboard",
  tourStep1Desc:
    "Your central hub: profile completeness, quick shortcuts to test an offer or CV, and recent activities.",
  tourStep1Badge: "Menu 1/3",
  tourStep2Title: "My CVs",
  tourStep2Desc:
    "Your CV vault: store multiple versions, review live ATS compliance, audit missing keywords, and download tailored documents.",
  tourStep2Badge: "Menu 2/3",
  tourStep3Title: "Profile",
  tourStep3Desc:
    "Complete your identity, experiences, skills and education to boost your profile strength.",
  tourStep3Badge: "Menu 3/3",
  tourStep4Title: "Quick actions",
  tourStep4Desc:
    "Upload a CV, launch an AI diagnostic, evaluate a job offer or prepare an interview in one click.",
  tourStep4Badge: "Step 4/7",
  tourStep5Title: "Profile overview",
  tourStep5Desc:
    "Your overall score and the key metrics: skills, experience, education, certifications and resume quality.",
  tourStep5Badge: "Step 5/7",
  tourStep6Title: "Your CVs",
  tourStep6Desc:
    "Each card shows the ATS score of your latest analysis. Click to open the preview and the full diagnostic.",
  tourStep6Badge: "Step 6/7",
  tourStep7Title: "Recent activity",
  tourStep7Desc:
    "Your latest moves: uploaded CVs, completed analyses, added experiences and skills.",
  tourStep7Badge: "Step 7/7",
};
const de = {
  welcomeBadge: "Erste Anmeldung",
  welcomeTitle: "Willkommen, {name}!",
  welcomeSubtitle:
    "Schön, dass Sie bei uns sind. Ihr ForPro-AI-Arbeitsbereich ist eingerichtet und bereit.",
  welcomeTourTitle: "Geführte Arbeitsbereichs-Tour",
  welcomeTourDesc:
    "Wir gehen gemeinsam durch die Menüs Ihres Arbeitsbereichs und zeigen Ihnen, wie er aufgebaut ist und was jedes Werkzeug ermöglicht.",
  welcomeStatMenus: "6 Wegpunkte",
  welcomeStatMenusLabel: "Live erklärt",
  welcomeStatTime: "< 1 Min",
  welcomeStatTimeLabel: "Schnelle Tour",
  welcomeStatSteps: "Schritt für Schritt",
  welcomeStatStepsLabel: "Ohne Seitenwechsel",
  welcomeClose: "Schließen",
  welcomeExplore: "Frei erkunden",
  welcomeStartTour: "Tour starten",
  welcomeHowLink: "So funktioniert's",
  howKicker: "ForPro-AI-Methodik",
  howTitle: "Wie funktioniert ForPro AI?",
  howSubtitle:
    "Drei bewährte Schritte, um Ihre technische Karriere Richtung Führung zu beschleunigen.",
  howClose: "Schließen",
  howGetStarted: "Jetzt starten",
  howStep1Title: "Laufbahn erfassen",
  howStep1Desc:
    "Laden Sie Ihren aktuellen CV hoch oder fügen Sie Ihre Meilenstein-Rollen hinzu, um Ihren Laufbahnplan zu erstellen.",
  howStep2Title: "KI-Diagnose & Gap-Analyse",
  howStep2Desc:
    "Unsere KI vergleicht Ihre Kompetenzen mit Lead-&-Architect-Standards, um wirkungsvolle Entwicklungsfelder zu identifizieren.",
  howStep3Title: "Matching & Simulationstraining",
  howStep3Desc:
    "Trainieren Sie System-Design-Interviews mit Echtzeit-Feedback und kommen Sie mit passenden Führungsrollen in Kontakt.",
  tourSkip: "Überspringen",
  tourBack: "Zurück",
  tourNext: "Weiter",
  tourDone: "Los geht's!",
  tourStep1Title: "Dashboard",
  tourStep1Desc:
    "Ihre Übersicht: Profilvollständigkeit, Schnellaktionen und letzte Aktivitäten. Ihr Ausgangspunkt.",
  tourStep1Badge: "Menü 1/3",
  tourStep2Title: "Meine CVs",
  tourStep2Desc:
    "Ihr Dokumentensafe: CV-Versionen speichern, ATS-Score verfolgen, Keywords prüfen und Dateien herunterladen.",
  tourStep2Badge: "Menü 2/3",
  tourStep3Title: "Profil",
  tourStep3Desc:
    "Vervollständigen Sie Identität, Erfahrungen, Kompetenzen und Ausbildung, um Ihre Profilstärke zu erhöhen.",
  tourStep3Badge: "Menü 3/3",
  tourStep4Title: "Schnellaktionen",
  tourStep4Desc:
    "Laden Sie einen CV hoch, starten Sie eine KI-Diagnose, bewerten Sie ein Stellenangebot oder bereiten Sie ein Interview vor.",
  tourStep4Badge: "Schritt 4/7",
  tourStep5Title: "Profilübersicht",
  tourStep5Desc:
    "Ihr Gesamtscore und die Kernkennzahlen: Kompetenzen, Erfahrung, Ausbildung, Zertifikate und CV-Qualität.",
  tourStep5Badge: "Schritt 5/7",
  tourStep6Title: "Ihre CVs",
  tourStep6Desc:
    "Jede Karte zeigt den ATS-Score Ihrer letzten Analyse. Klicken Sie für Vorschau und vollständige Diagnose.",
  tourStep6Badge: "Schritt 6/7",
  tourStep7Title: "Letzte Aktivitäten",
  tourStep7Desc:
    "Ihre letzten Schritte: hochgeladene CVs, abgeschlossene Analysen, hinzugefügte Erfahrungen und Kompetenzen.",
  tourStep7Badge: "Schritt 7/7",
};

const files = [
  ['src/i18n/messages/fr.json', fr],
  ['src/i18n/messages/en.json', en],
  ['src/i18n/messages/de.json', de],
];

for (const [path, additions] of files) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  if (!json.dashboard) {
    throw new Error(`Missing dashboard namespace in ${path}`);
  }
  if (!json.onboarding) {
    json.onboarding = {};
  }
  let added = 0;
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in json.onboarding)) {
      json.onboarding[key] = value;
      added += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: onboarding +${added} keys`);
}