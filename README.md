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

Le pipeline de validation documentaire est à couches, partagé par les deux parcours
(Quick Test public `/api/quick-test` et analyse authentifiée `/api/resume/analyze`) :

1. **Format** — magic-bytes serveur (`%PDF-`, ZIP DOCX, texte) + taille (5 Mo max) ;
2. **Extraction** — parseur PDF sans dépendance (WinAnsi/UTF-16) + `mammoth` pour DOCX ;
3. **Guardrail sémantique « est-ce un CV ? »** — **fusionné dans l'appel LLM** via le
   `responseSchema` (`is_cv`, `document_type`, `detected_language`, multilingue fr/en/de/…),
   avec un filet heuristique local (`src/lib/quick-test/guardrail.ts`) lorsque l'IA est indisponible ;
4. **Analyse** — Gemini Flash, schéma strict, fallback heuristique transparent (bandeau « mode dégradé » côté UI).

Modèles : **`gemini-3.5-flash-lite`** par défaut, fallback chaîne **`gemini-3.6-flash`**.
⚠️ Les générations Gemini 2.0/2.5 sont **décommissionnées par Google** (HTTP 404) et
`thinkingConfig` est rejeté (HTTP 400) par les modèles 3.x — ne pas les réintroduire.

## Déploiement

- **Vercel** (cible principale) — variables d'environnement via le dashboard.
- **Docker** — `docker compose up --build` (le `Dockerfile` build avec les `NEXT_PUBLIC_*`
  en build-args et injecte les secrets au runtime via `env_file: .env.local`).

