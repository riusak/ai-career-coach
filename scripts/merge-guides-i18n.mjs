// One-shot: merges the Chart 7 (localization + page guides) keys into the
// three message files — dashboard matching-studio keys + the new `guides`
// namespace (per-page onboarding guides).
// Run: node scripts/merge-guides-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fr = {
  dashboard: {
    matchingTitle: "Job Matching & Évaluation d'Offre",
    matchingSubtitle:
      "Choisissez le CV à évaluer, chargez l'offre (PDF/Word ou lien URL) et découvrez votre degré d'adéquation ainsi que les points clés à défendre en entretien.",
    matchingHistoryTitle: "Historique récent de vos matchings d'offres",
    matchingHistorySubtitle:
      "Retrouvez vos offres évaluées et relancez un entraînement à tout moment.",
    matchingHistoryCount:
      '{count, plural, =0 {aucune évaluation} one {# évaluation} other {# évaluations}}',
    matchingHistoryCv: 'CV : {name}',
    matchingSourceFile: 'Fichier PDF',
    matchingSourceUrl: 'Lien Web',
    matchingSourceText: 'Texte brut',
    matchingSimulateInterview: 'Simuler un entretien',
    matchingBackToDashboard: '← Dashboard',
    matchingPreviewEmptyTitle: 'Aucune évaluation en cours',
    matchingPreviewEmptyDesc:
      "Sélectionnez un CV à gauche, fournissez la fiche de poste (fichier ou lien URL) puis cliquez sur « Évaluer l'adéquation ».",
    matchingPerk1: "Calcul d'adéquation sémantique et compatibilité ATS",
    matchingPerk2: 'Identification des forces et des compétences manquantes',
    matchingPerk3: "Passerelle directe vers simulation d'entretien ciblée",
    matchingStepSelectCv: 'Sélectionner le CV à évaluer',
    matchingCvAvailableCount:
      '{count, plural, =0 {aucun CV disponible} one {# CV disponible} other {# CV disponibles}}',
    matchingPrimaryBadge: 'Principal',
    matchingCvAtsScore: 'Score ATS',
    matchingStepSubmitOffer: "Transmettre l'offre d'emploi",
    matchingJobTitle: 'Intitulé du poste (optionnel)',
    matchingCompany: 'Entreprise / Organisation',
    matchingCompanyPlaceholder: 'Ex. : Wave Mobile Money, Paystack, Orange…',
    matchingFileDropHint: 'Glissez-déposez la fiche de poste ou cliquez pour parcourir',
    matchingFileFormats:
      'Formats acceptés : PDF (.pdf), Word (.docx) ou texte (.txt) — 5 Mo max.',
    matchingSelectedCv: 'CV sélectionné : {name}',
    matchingNoCvSelected: 'Aucun CV sélectionné',
    matchingDefaultJobTitle: "Offre d'emploi",
    matchingQueueCta: "Évaluer l'adéquation avec l'offre",
  },
  guides: {
    show: 'Guide de la page',
    hide: 'Masquer le guide',
    toggleTitle: 'Afficher ou masquer le guide de prise en main de cette page',
    collapse: 'Réduire',
    showSteps: 'Voir les étapes',
    expand: 'Déplier le guide',
    dismiss: "J'ai compris",
    dismissTitle: 'Masquer ce guide',
    globalTour: 'Tour Global',
    globalTourTitle: 'Relancer le tour global du tableau de bord',
    proTipLabel: 'Astuce ForPro :',
    matching: {
      tag: 'GUIDE DE PRISE EN MAIN • JOB MATCHING',
      title: "Comment évaluer votre CV face à une offre d'emploi ?",
      subtitle:
        'Mesurez votre compatibilité technique en 3 étapes simples et lancez un entraînement ciblé.',
      steps: [
        {
          title: 'Sélectionnez votre CV',
          desc: 'Choisissez votre CV de référence (ex. Architecte Cloud) parmi vos versions enregistrées.',
          badge: 'Sélection',
        },
        {
          title: "Déposez l'offre d'emploi",
          desc: 'Glissez un fichier PDF ou Word (DOCX), ou collez directement le lien URL LinkedIn / site carrière.',
          badge: 'PDF / Word / URL',
        },
        {
          title: 'Diagnostic & Simulation',
          desc: "Découvrez votre score d'adéquation et cliquez sur « Lancer une simulation d'entretien pour cette offre ».",
          badge: 'Passerelle Entretien',
        },
      ],
      proTip:
        "L'analyse IA identifie les mots-clés obligatoires manquants et pondère les écarts de séniorité pour maximiser vos chances.",
    },
    cvs: {
      tag: 'GUIDE DE PRISE EN MAIN • GESTIONNAIRE DE CVS',
      title: 'Comment optimiser et gérer vos versions de CV ?',
      subtitle: 'Passez les filtres ATS et adaptez votre profil selon les postes visés.',
      steps: [
        {
          title: 'Importez vos CVs',
          desc: 'Glissez vos fichiers PDF ou Word (.docx) : votre historique professionnel est extrait automatiquement.',
          badge: 'Parsing',
        },
        {
          title: 'Audit ATS & Lisibilité',
          desc: 'Visualisez votre note de compatibilité, les forces détectées et les compétences à valoriser.',
          badge: 'Score ATS',
        },
        {
          title: 'CV Principal & Actions',
          desc: 'Définissez votre CV de référence, prévisualisez-le et lancez matching ou simulation en un clic.',
          badge: 'Étoile ★',
        },
      ],
      proTip:
        'Un CV ciblé par offre vaut mieux que trois CV génériques : dupliquez votre CV principal puis adaptez-le au poste visé.',
    },
    mock: {
      tag: "GUIDE DE PRISE EN MAIN • SIMULATIONS D'ENTRETIENS",
      title: "Comment réussir votre simulation d'entretien vocal IA ?",
      subtitle:
        "Entraînez-vous à l'oral en conditions réelles et recevez un feedback méthodologique STAR complet.",
      steps: [
        {
          title: "Choisissez l'offre ciblée",
          desc: 'Sélectionnez une offre récemment matchée (ex. Wave, Paystack) ou uploadez-en une directement.',
          badge: 'Offre ciblée',
        },
        {
          title: 'Activez le mode Audio & Langue',
          desc: "Choisissez le Français ou l'Anglais, écoutez les questions posées à haute voix et parlez au micro.",
          badge: 'Audio & Voix',
        },
        {
          title: 'Débriefing STAR & Conseils',
          desc: 'Obtenez un score chiffré (clarté, profondeur technique) et des axes de reformulation concrets.',
          badge: 'Feedback IA',
        },
      ],
      proTip:
        'Structurez vos réponses orales selon la méthode STAR (Situation, Tâche, Action, Résultat chiffré) pour dépasser 90/100.',
    },
    timeline: {
      tag: 'GUIDE DE PRISE EN MAIN • ROADMAP CARRIÈRE',
      title: 'Comment piloter votre progression carrière ?',
      subtitle: 'Visualisez votre trajectoire, vos étapes clés et les compétences à consolider.',
      steps: [
        {
          title: 'Explorez votre trajectoire',
          desc: 'Chaque carte représente une étape réelle de votre parcours avec missions et technologies.',
          badge: 'Panoramique',
        },
        {
          title: 'Détaillez chaque étape',
          desc: 'Cliquez sur une carte pour consulter les missions clés et les technologies mobilisées.',
          badge: 'Détails',
        },
        {
          title: 'Fixez votre cap',
          desc: 'Renseignez votre objectif de carrière dans votre profil : il devient la référence de votre progression.',
          badge: 'Objectif',
        },
      ],
      proTip:
        'Un objectif de carrière renseigné débloque les évaluations de compatibilité et affine vos recommandations.',
    },
    analytics: {
      tag: 'GUIDE DE PRISE EN MAIN • ANALYSES & STATISTIQUES',
      title: 'Comment lire vos indicateurs de carrière ?',
      subtitle: 'Suivez la force de votre profil, vos scores ATS et votre objectif de carrière.',
      steps: [
        {
          title: 'Mesurez votre profil',
          desc: 'La force du profil agrège identité, expériences, formations, compétences et CV.',
          badge: 'KPIs',
        },
        {
          title: 'Suivez vos scores ATS',
          desc: 'Comparez le score moyen et le meilleur score de vos CV analysés.',
          badge: 'Score ATS',
        },
        {
          title: 'Alignez votre objectif',
          desc: 'Votre objectif de carrière (poste cible + technologies) sert de référence aux évaluations.',
          badge: 'Objectif',
        },
      ],
      proTip:
        'Complétez votre profil et analysez au moins un CV pour alimenter automatiquement vos statistiques.',
    },
  },
};

const en = {
  dashboard: {
    matchingSubtitle:
      'Pick the CV to evaluate, upload the offer (PDF/Word or URL link) and discover your fit score plus the key points to defend in the interview.',
    matchingHistoryTitle: 'Recent job matching history',
    matchingHistorySubtitle: 'Review your evaluated offers and launch a practice session anytime.',
    matchingHistoryCount:
      '{count, plural, =0 {no evaluations} one {# evaluation} other {# evaluations}}',
    matchingHistoryCv: 'CV: {name}',
    matchingSourceFile: 'PDF file',
    matchingSourceUrl: 'Web link',
    matchingSourceText: 'Plain text',
    matchingSimulateInterview: 'Mock interview',
    matchingBackToDashboard: '← Dashboard',
    matchingPreviewEmptyTitle: 'No evaluation in progress',
    matchingPreviewEmptyDesc:
      'Select a CV on the left, provide the job offer (file or URL link) then click “Evaluate job match”.',
    matchingPerk1: 'Semantic fit computation and ATS compatibility',
    matchingPerk2: 'Strengths and missing skills identification',
    matchingPerk3: 'Direct bridge to targeted interview simulation',
    matchingStepSelectCv: 'Select the CV to evaluate',
    matchingCvAvailableCount:
      '{count, plural, =0 {no CV available} one {# CV available} other {# CVs available}}',
    matchingPrimaryBadge: 'Primary',
    matchingCvAtsScore: 'ATS score',
    matchingStepSubmitOffer: 'Submit the job offer',
    matchingJobTitle: 'Job title (optional)',
    matchingCompany: 'Company / Organization',
    matchingCompanyPlaceholder: 'e.g. Wave Mobile Money, Paystack, Orange…',
    matchingFileDropHint: 'Drag & drop the job offer or click to browse',
    matchingFileFormats:
      'Accepted formats: PDF (.pdf), Word (.docx) or text (.txt) — 5 MB max.',
    matchingSelectedCv: 'Selected CV: {name}',
    matchingNoCvSelected: 'No CV selected',
    matchingDefaultJobTitle: 'Job offer',
    matchingQueueCta: 'Evaluate job match',
  },
  guides: {
    show: 'Page guide',
    hide: 'Hide guide',
    toggleTitle: 'Show or hide this page’s quick-start guide',
    collapse: 'Collapse',
    showSteps: 'View steps',
    expand: 'Expand the guide',
    dismiss: 'Got it',
    dismissTitle: 'Dismiss this guide',
    globalTour: 'Global Tour',
    globalTourTitle: 'Replay the global dashboard tour',
    proTipLabel: 'ForPro Tip:',
    matching: {
      tag: 'QUICK START GUIDE • JOB MATCHING',
      title: 'How to match your CV against any job offer?',
      subtitle: 'Measure your technical compatibility in 3 steps and trigger targeted practice.',
      steps: [
        {
          title: 'Select your target CV',
          desc: 'Pick your benchmark CV (e.g. Cloud Architect) from your stored versions.',
          badge: 'Selection',
        },
        {
          title: 'Upload or paste job offer',
          desc: 'Drag & drop a PDF/Word file, or paste a LinkedIn / career-site URL.',
          badge: 'PDF / Word / URL',
        },
        {
          title: 'Diagnosis & Simulation',
          desc: 'Get your compatibility breakdown and click “Launch an interview simulation for this offer”.',
          badge: 'Interview Bridge',
        },
      ],
      proTip:
        'The AI model spots missing core keywords and weights seniority gaps to maximize your callback rate.',
    },
    cvs: {
      tag: 'QUICK START GUIDE • CV MANAGER',
      title: 'How to manage and optimize your CV versions?',
      subtitle: 'Beat ATS filters and tailor your profile for the roles you target.',
      steps: [
        {
          title: 'Import your CVs',
          desc: 'Drop your PDF or Word (.docx) files: your career history is extracted automatically.',
          badge: 'Parsing',
        },
        {
          title: 'ATS Audit & Readability',
          desc: 'Review your compatibility score, detected strengths and skills to showcase.',
          badge: 'ATS score',
        },
        {
          title: 'Primary CV & Actions',
          desc: 'Set your benchmark CV, preview it and launch matching or a mock interview in one click.',
          badge: 'Star ★',
        },
      ],
      proTip:
        'One offer-tailored CV beats three generic ones: duplicate your primary CV then adapt it to the target role.',
    },
    mock: {
      tag: 'QUICK START GUIDE • MOCK INTERVIEWS',
      title: 'How to ace your AI voice mock interview session?',
      subtitle:
        'Practice speaking under real conditions and receive thorough STAR structured feedback.',
      steps: [
        {
          title: 'Pick the target offer',
          desc: 'Select a recently matched offer (e.g. Wave, Paystack) or upload a new one directly.',
          badge: 'Target offer',
        },
        {
          title: 'Enable Audio & Language',
          desc: 'Choose French or English, listen to the questions read aloud and answer with your mic.',
          badge: 'Audio & Voice',
        },
        {
          title: 'STAR Debrief & Tips',
          desc: 'Get a quantified score (clarity, technical depth) and concrete reformulation advice.',
          badge: 'AI feedback',
        },
      ],
      proTip:
        'Structure your spoken answers with the STAR method (Situation, Task, Action, Result) to score above 90/100.',
    },
    timeline: {
      tag: 'QUICK START GUIDE • CAREER ROADMAP',
      title: 'How to steer your career progression?',
      subtitle: 'Visualize your trajectory, key milestones and the skills to consolidate.',
      steps: [
        {
          title: 'Explore your trajectory',
          desc: 'Each card is a real milestone of your journey with missions and technologies.',
          badge: 'Panoramic',
        },
        {
          title: 'Detail every milestone',
          desc: 'Click a card to review its key missions and the technologies you mobilized.',
          badge: 'Details',
        },
        {
          title: 'Set your course',
          desc: 'Fill in your career goal in your profile: it becomes the reference of your progression.',
          badge: 'Goal',
        },
      ],
      proTip:
        'A documented career goal unlocks fit evaluations and sharpens your recommendations.',
    },
    analytics: {
      tag: 'QUICK START GUIDE • ANALYTICS',
      title: 'How to read your career metrics?',
      subtitle: 'Track your profile strength, ATS scores and career goal.',
      steps: [
        {
          title: 'Measure your profile',
          desc: 'Profile strength aggregates identity, experiences, education, skills and CVs.',
          badge: 'KPIs',
        },
        {
          title: 'Track your ATS scores',
          desc: 'Compare the average and best scores across your analyzed CVs.',
          badge: 'ATS score',
        },
        {
          title: 'Align your goal',
          desc: 'Your career goal (target role + technologies) is the reference for evaluations.',
          badge: 'Goal',
        },
      ],
      proTip:
        'Complete your profile and analyze at least one CV to automatically feed your statistics.',
    },
  },
};


const de = {
  dashboard: {
    matchingSubtitle:
      'Wählen Sie den zu bewertenden Lebenslauf, laden Sie das Angebot hoch (PDF/Word oder Link) und entdecken Sie Ihren Passungsgrad sowie die wichtigsten Punkte für das Vorstellungsgespräch.',
    matchingHistoryTitle: 'Ihre letzten Stellenabgleiche',
    matchingHistorySubtitle:
      'Finden Sie Ihre bewerteten Angebote und starten Sie jederzeit ein Training.',
    matchingHistoryCount:
      '{count, plural, =0 {keine Bewertungen} one {# Bewertung} other {# Bewertungen}}',
    matchingHistoryCv: 'CV: {name}',
    matchingSourceFile: 'PDF-Datei',
    matchingSourceUrl: 'Weblink',
    matchingSourceText: 'Klartext',
    matchingSimulateInterview: 'Interview simulieren',
    matchingBackToDashboard: '← Dashboard',
    matchingPreviewEmptyTitle: 'Keine Bewertung im Gange',
    matchingPreviewEmptyDesc:
      'Wählen Sie links einen Lebenslauf, geben Sie die Stellenanzeige an (Datei oder Link) und klicken Sie auf „Passung bewerten“.',
    matchingPerk1: 'Semantische Passungsberechnung und ATS-Kompatibilität',
    matchingPerk2: 'Erkennung von Stärken und fehlenden Kompetenzen',
    matchingPerk3: 'Direkter Einstieg in die gezielte Interviewsimulation',
    matchingStepSelectCv: 'Zu bewertenden Lebenslauf auswählen',
    matchingCvAvailableCount:
      '{count, plural, =0 {kein CV verfügbar} one {# CV verfügbar} other {# CVs verfügbar}}',
    matchingPrimaryBadge: 'Primär',
    matchingCvAtsScore: 'ATS-Score',
    matchingStepSubmitOffer: 'Stellenanzeige übermitteln',
    matchingJobTitle: 'Stellenbezeichnung (optional)',
    matchingCompany: 'Unternehmen / Organisation',
    matchingCompanyPlaceholder: 'z. B. Wave Mobile Money, Paystack, Orange…',
    matchingFileDropHint: 'Stellenanzeige hierher ziehen oder klicken, um zu durchsuchen',
    matchingFileFormats:
      'Akzeptierte Formate: PDF (.pdf), Word (.docx) oder Text (.txt) — max. 5 MB.',
    matchingSelectedCv: 'Ausgewählter CV: {name}',
    matchingNoCvSelected: 'Kein Lebenslauf ausgewählt',
    matchingDefaultJobTitle: 'Stellenangebot',
    matchingQueueCta: 'Passung bewerten',
  },
  guides: {
    show: 'Seiten-Guide',
    hide: 'Guide ausblenden',
    toggleTitle: 'Schnellstart-Guide dieser Seite ein- oder ausblenden',
    collapse: 'Einklappen',
    showSteps: 'Schritte anzeigen',
    expand: 'Guide ausklappen',
    dismiss: 'Verstanden',
    dismissTitle: 'Diesen Guide ausblenden',
    globalTour: 'Globale Tour',
    globalTourTitle: 'Globale Dashboard-Tour erneut starten',
    proTipLabel: 'ForPro-Tipp:',
    matching: {
      tag: 'SCHNELLSTART-GUIDE • JOB-MATCHING',
      title: 'Wie bewerten Sie Ihren Lebenslauf gegen eine Stellenanzeige?',
      subtitle:
        'Messen Sie Ihre technische Passung in 3 einfachen Schritten und starten Sie ein gezieltes Training.',
      steps: [
        {
          title: 'Wählen Sie Ihren Referenz-Lebenslauf',
          desc: 'Wählen Sie Ihren Referenz-Lebenslauf (z. B. Cloud-Architekt) aus Ihren gespeicherten Versionen.',
          badge: 'Auswahl',
        },
        {
          title: 'Laden Sie die Stellenanzeige hoch',
          desc: 'Ziehen Sie eine PDF- oder Word-Datei (DOCX) herüber oder fügen Sie den LinkedIn-/Karriere-Link ein.',
          badge: 'PDF / Word / URL',
        },
        {
          title: 'Diagnose & Simulation',
          desc: 'Entdecken Sie Ihren Passungs-Score und klicken Sie auf „Interviewsimulation für dieses Angebot starten“.',
          badge: 'Interview-Brücke',
        },
      ],
      proTip:
        'Die KI-Analyse erkennt fehlende Pflicht-Keywords und gewichtet Senioritätsabstände, um Ihre Chancen zu maximieren.',
    },
    cvs: {
      tag: 'SCHNELLSTART-GUIDE • CV-MANAGER',
      title: 'Wie optimieren und verwalten Sie Ihre Lebenslauf-Versionen?',
      subtitle: 'Überwinden Sie ATS-Filter und passen Sie Ihr Profil an Ihre Zielstellen an.',
      steps: [
        {
          title: 'Importieren Sie Ihre CVs',
          desc: 'Ziehen Sie Ihre PDF- oder Word-Dateien (.docx) herüber: Ihr Werdegang wird automatisch extrahiert.',
          badge: 'Parsing',
        },
        {
          title: 'ATS-Audit & Lesbarkeit',
          desc: 'Sehen Sie Ihren Kompatibilitäts-Score, erkannte Stärken und hervorzuhebende Kompetenzen.',
          badge: 'ATS-Score',
        },
        {
          title: 'Primär-CV & Aktionen',
          desc: 'Legen Sie Ihren Referenz-Lebenslauf fest, sehen Sie ihn sich an und starten Sie Matching oder Simulation mit einem Klick.',
          badge: 'Stern ★',
        },
      ],
      proTip:
        'Ein auf ein Angebot zugeschnittener CV schlägt drei generische: duplizieren Sie Ihren Primär-CV und passen Sie ihn an die Zielstelle an.',
    },
    mock: {
      tag: 'SCHNELLSTART-GUIDE • SIMULIERTE INTERVIEWS',
      title: 'Wie meistern Sie Ihre KI-Mock-Interview-Session?',
      subtitle:
        'Üben Sie das Sprechen unter realen Bedingungen und erhalten Sie strukturiertes STAR-Feedback.',
      steps: [
        {
          title: 'Wählen Sie das Zielangebot',
          desc: 'Wählen Sie ein kürzlich gematchtes Angebot (z. B. Wave, Paystack) oder laden Sie direkt eines hoch.',
          badge: 'Zielangebot',
        },
        {
          title: 'Aktivieren Sie Audio & Sprache',
          desc: 'Wählen Sie Deutsch oder Englisch, hören Sie die Fragen laut vor und antworten Sie per Mikrofon.',
          badge: 'Audio & Stimme',
        },
        {
          title: 'STAR-Debriefing & Tipps',
          desc: 'Erhalten Sie einen bewerteten Score (Klarheit, technische Tiefe) und konkrete Formulierungshinweise.',
          badge: 'KI-Feedback',
        },
      ],
      proTip:
        'Strukturieren Sie Ihre mündlichen Antworten nach der STAR-Methode (Situation, Task, Action, Result), um über 90/100 zu erzielen.',
    },
    timeline: {
      tag: 'SCHNELLSTART-GUIDE • KARRIERE-ROADMAP',
      title: 'Wie steuern Sie Ihre Karriereentwicklung?',
      subtitle:
        'Visualisieren Sie Ihren Weg, Ihre wichtigsten Etappen und die zu festigenden Kompetenzen.',
      steps: [
        {
          title: 'Erkunden Sie Ihren Weg',
          desc: 'Jede Karte ist eine echte Etappe Ihres Werdegangs mit Missionen und Technologien.',
          badge: 'Panorama',
        },
        {
          title: 'Detailieren Sie jede Etappe',
          desc: 'Klicken Sie auf eine Karte, um die wichtigsten Missionen und eingesetzten Technologien zu sehen.',
          badge: 'Details',
        },
        {
          title: 'Setzen Sie Ihren Kurs',
          desc: 'Hinterlegen Sie Ihr Karriereziel in Ihrem Profil: Es wird zur Referenz Ihrer Entwicklung.',
          badge: 'Ziel',
        },
      ],
      proTip:
        'Ein dokumentiertes Karriereziel schaltet Passungsbewertungen frei und schärft Ihre Empfehlungen.',
    },
    analytics: {
      tag: 'SCHNELLSTART-GUIDE • ANALYSEN & STATISTIKEN',
      title: 'Wie lesen Sie Ihre Karriere-Kennzahlen?',
      subtitle:
        'Verfolgen Sie Ihre Profil-Stärke, Ihre ATS-Scores und Ihr Karriereziel.',
      steps: [
        {
          title: 'Messen Sie Ihr Profil',
          desc: 'Die Profil-Stärke aggregiert Identität, Erfahrungen, Ausbildung, Kompetenzen und CVs.',
          badge: 'KPIs',
        },
        {
          title: 'Verfolgen Sie Ihre ATS-Scores',
          desc: 'Vergleichen Sie den Durchschnitts- und den besten Score Ihrer analysierten CVs.',
          badge: 'ATS-Score',
        },
        {
          title: 'Richten Sie Ihr Ziel aus',
          desc: 'Ihr Karriereziel (Zielrolle + Technologien) ist die Referenz für die Bewertungen.',
          badge: 'Ziel',
        },
      ],
      proTip:
        'Vervollständigen Sie Ihr Profil und analysieren Sie mindestens einen CV, um Ihre Statistiken automatisch zu speisen.',
    },
  },
};

const LOCALES = [
  { path: 'src/i18n/messages/fr.json', patch: fr },
  { path: 'src/i18n/messages/en.json', patch: en },
  { path: 'src/i18n/messages/de.json', patch: de },
];

for (const { path, patch } of LOCALES) {
  const json = JSON.parse(readFileSync(path, 'utf8'));

  // Merge the dashboard keys (update existing + append new ones).
  json.dashboard = { ...json.dashboard, ...patch.dashboard };

  // Add (or refresh) the top-level `guides` namespace.
  json.guides = { ...(json.guides ?? {}), ...patch.guides };

  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: dashboard +${Object.keys(patch.dashboard).length} keys, guides merged`);
}


