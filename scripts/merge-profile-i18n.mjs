// One-shot: merges the Phase 4 profile-experience enrichment keys into the
// message files (migration 010 fields + inline edit UI).
// Run: node scripts/merge-profile-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const fr = {
  edit: "Modifier",
  save: "Enregistrer",
  cancel: "Annuler",
  keyMissions: "Missions clés",
  keyMissionsHint: "Une mission par ligne — ex. « Piloté la migration vers Kubernetes ».",
  technologies: "Technologies",
  technologiesHint: "Séparées par des virgules — ex. React, Node.js, PostgreSQL.",
  domain: "Domaine",
  domainPlaceholder: "Choisir un domaine…",
  domainFrontend: "Frontend",
  domainBackend: "Backend",
  domainArchitecture: "Architecture",
  domainDevops: "DevOps",
  domainMobile: "Mobile",
  domainData: "Data",
  domainOther: "Autre",
};

const en = {
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  keyMissions: "Key missions",
  keyMissionsHint: "One mission per line — e.g. \u201cLed the Kubernetes migration\u201d.",
  technologies: "Technologies",
  technologiesHint: "Comma-separated — e.g. React, Node.js, PostgreSQL.",
  domain: "Domain",
  domainPlaceholder: "Choose a domain…",
  domainFrontend: "Frontend",
  domainBackend: "Backend",
  domainArchitecture: "Architecture",
  domainDevops: "DevOps",
  domainMobile: "Mobile",
  domainData: "Data",
  domainOther: "Other",
};

const files = [
  ['src/i18n/messages/fr.json', fr],
  ['src/i18n/messages/en.json', en],
];

for (const [path, additions] of files) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  if (!json.profile) {
    throw new Error(`Missing profile namespace in ${path}`);
  }
  let added = 0;
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in json.profile)) {
      json.profile[key] = value;
      added += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: profile +${added} keys`);
}

const de = {
  edit: "Bearbeiten",
  save: "Speichern",
  cancel: "Abbrechen",
  keyMissions: "Kernaufgaben",
  keyMissionsHint: "Eine Aufgabe pro Zeile — z. B. \u201eKubernetes-Migration geleitet\u201c.",
  technologies: "Technologien",
  technologiesHint: "Durch Kommas getrennt — z. B. React, Node.js, PostgreSQL.",
  domain: "Bereich",
  domainPlaceholder: "Bereich wählen…",
  domainFrontend: "Frontend",
  domainBackend: "Backend",
  domainArchitecture: "Architektur",
  domainDevops: "DevOps",
  domainMobile: "Mobile",
  domainData: "Data",
  domainOther: "Sonstige",
};

const deEntry = ['src/i18n/messages/de.json', de];
{
  const [path, additions] = deEntry;
  const json = JSON.parse(readFileSync(path, 'utf8'));
  if (!json.profile) {
    throw new Error(`Missing profile namespace in ${path}`);
  }
  let added = 0;
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in json.profile)) {
      json.profile[key] = value;
      added += 1;
    }
  }
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  console.log(`${path}: profile +${added} keys`);
}