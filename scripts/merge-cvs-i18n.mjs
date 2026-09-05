// One-shot: merges the Phase 5.1 CVs-page keys into the dashboard namespace.
// Run: node scripts/merge-cvs-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fr = {
  cvsAnalyze: "Analyser",
  cvsAnalyzePending: "Mise en file…",
  cvsQueuedHint: "Analyse en file d'attente — suivez sa progression sur la page du CV.",
  cvsNoScore: "Non analysé",
  cvsAnalyzedCount: "{count, plural, one {# CV analysé} other {# CVs analysés}}",
};

const en = {
  cvsAnalyze: "Analyze",
  cvsAnalyzePending: "Queueing…",
  cvsQueuedHint: "Analysis queued — follow its progress on the CV page.",
  cvsNoScore: "Not analyzed",
  cvsAnalyzedCount: "{count, plural, one {# analyzed CV} other {# analyzed CVs}}",
};

const de = {
  cvsAnalyze: "Analysieren",
  cvsAnalyzePending: "Wird eingereiht…",
  cvsQueuedHint: "Analyse eingereiht — Verlauf auf der CV-Seite verfolgen.",
  cvsNoScore: "Nicht analysiert",
  cvsAnalyzedCount: "{count, plural, one {# analysierter CV} other {# analysierte CVs}}",
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
  let added = 0;
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in json.dashboard)) {
      json.dashboard[key] = value;
      added += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: dashboard +${added} keys`);
}