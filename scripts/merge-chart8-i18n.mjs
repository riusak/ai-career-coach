// One-shot: merges the Chart 8 (ergonomic job-matching flow) keys into the
// three message files — matching outcome status labels + renamed progress steps.
// Run: node scripts/merge-chart8-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const patches = {
  'src/i18n/messages/fr.json': {
    matchingSteps: [
      "Analyse sémantique de l'offre et du CV…",
      'Vérification de la compatibilité ATS…',
      'Détection des écarts de compétences…',
    ],
    additions: {
      matchingEvalTitle: 'Évaluation en cours',
      matchingEvalHint: "Le diagnostic complet apparaîtra ici dès la fin de l'analyse.",
      matchingDiagnosticTitle: 'Diagnostic du matching',
      matchingStatusRunning: 'IA active',
      matchingStatusSuccess: 'Succès',
      matchingStatusFailed: 'Échec',
    },
  },
  'src/i18n/messages/en.json': {
    matchingSteps: [
      'Semantic analysis of the offer and CV…',
      'Checking ATS compatibility…',
      'Detecting skill gaps…',
    ],
    additions: {
      matchingEvalTitle: 'Evaluation in progress',
      matchingEvalHint: 'The full diagnostic will appear here as soon as the analysis completes.',
      matchingDiagnosticTitle: 'Matching diagnostic',
      matchingStatusRunning: 'AI active',
      matchingStatusSuccess: 'Success',
      matchingStatusFailed: 'Failed',
    },
  },
  'src/i18n/messages/de.json': {
    matchingSteps: [
      'Semantische Analyse von Angebot und Lebenslauf…',
      'Prüfung der ATS-Kompatibilität…',
      'Erkennung von Kompetenzlücken…',
    ],
    additions: {
      matchingEvalTitle: 'Bewertung läuft',
      matchingEvalHint: 'Die vollständige Diagnose erscheint hier, sobald die Analyse abgeschlossen ist.',
      matchingDiagnosticTitle: 'Abgleich-Diagnose',
      matchingStatusRunning: 'KI aktiv',
      matchingStatusSuccess: 'Erfolg',
      matchingStatusFailed: 'Fehlgeschlagen',
    },
  },
};

for (const [path, { matchingSteps, additions }] of Object.entries(patches)) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  json.dashboard.matchingSteps = matchingSteps;
  json.dashboard = { ...json.dashboard, ...additions };
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: matchingSteps + ${Object.keys(additions).length} keys`);
}