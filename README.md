# ForPro AI

Coach de carrière assisté par IA : analyse de CV (Quick Test public + analyse approfondie pour les comptes), dashboard candidat et console d'administration.

Stack : **Next.js (App Router) · TypeScript strict · Tailwind CSS · Supabase (SSR + RLS) · Gemini (Google AI) · Vitest · Playwright**.

## Démarrage

```bash
npm ci
cp .env.example .env.local   # renseigner les variables (Supabase, GEMINI_API_KEY…)
npm run dev
```

Scripts utiles : `npm run lint` · `npm run type-check` · `npm test` · `npm run build` · `node scripts/test-gemini.mjs` (diagnostic LLM).

## Architecture LLM (analyse de CV)

Le pipeline d'analyse est **document-native (multimodal)**, partagé par les deux parcours
(Quick Test public `/api/quick-test` et analyse authentifiée `/api/resume/analyze`) :

1. **Format** — magic-bytes serveur (`%PDF-`, ZIP DOCX, texte) + taille (5 Mo max) ;
2. **Extraction légère** — le texte extrait (parseur PDF sans dépendance + `mammoth` pour
   DOCX) ne sert qu'aux métadonnées (pageCount, wordCount, parsed_content) et à
   l'alimentation DOCX/TXT ;
3. **Analyse document-native** — les **PDF sont envoyés tels quel** à Gemini
   (`inline_data`, base64) : le modèle « voit » la vraie mise en page (colonnes, sidebars,
   hiérarchie visuelle) comme un recruteur ou un ATS ; les PDF scannés (images) sont donc
   analysables. DOCX/TXT partent en texte extrait (Gemini ne les lit pas nativement) ;
4. **Prompt complet fond + forme** — évalue la mise en page & lisibilité (risque de parsing
   ATS des colonnes/sidebars), la hiérarchie visuelle, ET les dimensions de contenu
   (Structure, Impact chiffré, Clarté, Adéquation poste, Mots-clés ATS, verbes d'action) ;
5. **Guardrail sémantique « est-ce un CV ? »** — fusionné dans l'appel LLM via le
   `responseSchema` (`is_cv`, `document_type`, `detected_language`, multilingue fr/en/de/…) ;
6. **Aucun fallback silencieux** — retries explicites avec backoff sur les erreurs
   transitoires (429/5xx, réseau, génération corrompue), chaîne de modèles, puis **erreur
   visible** (HTTP 502 / suppression de la ligne en attente) : jamais de faux score.

Modèles : **`gemini-3.5-flash-lite`** par défaut, fallback chaîne **`gemini-3.6-flash`**.
⚠️ Les générations Gemini 2.0/2.5 sont **décommissionnées par Google** (HTTP 404) et
`thinkingConfig` est rejeté (HTTP 400) par les modèles 3.x — ne pas les réintroduire.

## Déploiement

- **Vercel** (cible principale) — variables d'environnement via le dashboard.
- **Docker** — `docker compose up --build` (le `Dockerfile` build avec les `NEXT_PUBLIC_*`
  en build-args et injecte les secrets au runtime via `env_file: .env.local`).

