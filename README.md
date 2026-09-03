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
(Quick Test public `/api/quick-test` et analyse authentifiée `/api/resume/analyze`).
**Toute la logique métier vit dans un module UNIQUE : `src/lib/analysis/pipeline.ts`** —
les deux routes ne sont que des adaptateurs HTTP minces (tracking/rate-limit anonyme pour
le funnel public ; file d'attente/ownership pour le parcours authentifié). Il n'existe
qu'**un seul** pipeline d'ingestion → validation → extraction → conversion multimodale →
appel LLM, donc chaque document bénéficie exactement de la même logique stable :

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

### Progression temps réel (« billet d'attente »)

`/api/quick-test` répond en **flux NDJSON** (`application/ndjson`) : chaque stade réel du
pipeline (`reading` → `analyzing` → `reporting`) est diffusé sous forme de ligne `progress`,
puis une ligne terminale `result` (ou `error`) porte le rapport ou l'erreur machine. Le
« billet d'attente » du funnel avance donc en lockstep avec les vrais appels (lecture
multimodale, parsing sémantique / scoring, génération du rapport), avec un repli
« forward-only » côté client si l'hébergeur bufferise le flux. Le parcours authentifié
(`/api/resume/analyze`) persiste en plus un marqueur de stade dans `structured_output`
que le polling du dashboard traduit en progression réelle.

## Déploiement

- **Vercel** (cible principale) — variables d'environnement via le dashboard.
- **Docker** — `docker compose up --build` (le `Dockerfile` build avec les `NEXT_PUBLIC_*`
  en build-args et injecte les secrets au runtime via `env_file: .env.local`).

