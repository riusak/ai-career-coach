import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import QuickTestFunnel from '@/components/landing/QuickTestFunnel';
import { createClient } from '@/utils/supabase/server';

/**
 * Landing page — instant career acceleration with the visitor Quick Test
 * funnel front and center (docs/product/mvp.md §2). "Light & Gold" aesthetic.
 */

const SERVICES = [
  {
    title: 'Analyse IA de CV',
    description:
      'Un diagnostic instantané : score global, points forts, points faibles et recommandations concrètes pour passer au niveau supérieur.',
    locked: false,
  },
  {
    title: 'Matching offre d’emploi',
    description:
      'Confrontez votre CV à une offre cible et découvrez votre score d’adéquation, les mots-clés manquants et les écarts à combler.',
    locked: true,
  },
  {
    title: 'Simulations d’entretien',
    description:
      'Entraînez-vous à l’oral avec un coach IA : questions comportementales et techniques, évaluées en temps réel.',
    locked: true,
  },
  {
    title: 'Bibliothèque & progression',
    description:
      'Gérez plusieurs versions de votre CV, suivez vos analyses dans le temps et mesurez vos progrès.',
    locked: true,
  },
] as const;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* Hero — direct value proposition + Quick Test funnel */}
        <section id="accueil" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-gold-100/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-gold-50 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-medium text-gold-800">
                <span aria-hidden="true" className="flex h-2 w-2 rounded-full bg-gold-500" />
                Nouveau · Testez votre CV gratuitement, sans compte
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl xl:leading-[1.05]">
                Accélérez votre carrière{' '}
                <span className="bg-gradient-to-r from-gold-600 via-gold-700 to-gold-800 bg-clip-text text-transparent">
                  en moins de 2 minutes
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-base text-slate-600 sm:text-lg lg:mx-0">
                Déposez votre CV, recevez immédiatement un score et des recommandations
                concrètes. Rapide, simple, et <strong className="font-semibold text-slate-900">complètement gratuit</strong> —
                sans créer de compte.
              </p>

              <ul className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-slate-600 lg:mx-0 lg:justify-start">
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-gold-600">✦</span> Aucune inscription
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-gold-600">✦</span> Résultat instantané
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-gold-600">✦</span> Rien n’est conservé
                </li>
              </ul>
            </div>

            <QuickTestFunnel isAuthenticated={Boolean(user)} />
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-24 border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
                Services
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Un coach de carrière complet, propulsé par l’IA
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Commencez gratuitement par l’analyse de CV, puis débloquez l’ensemble
                de l’écosystème en créant votre compte.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map((service) => (
                <div
                  key={service.title}
                  className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                    {service.title}
                    {service.locked && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-gold-600"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                  {service.locked && (
                    <p className="mt-3 text-xs font-medium text-gold-700">
                      Débloqué avec un compte gratuit
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* Billing */}
        <section id="billing" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
                Billing
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Commencez gratuitement, évoluez quand vous voulez
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {/* Free plan */}
              <div className="rounded-2xl border border-gold-300 bg-white p-8 shadow-md">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Découverte</h3>
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-semibold text-gold-800">
                    Actuel
                  </span>
                </div>
                <p className="mt-3 text-4xl font-extrabold">
                  0 €
                  <span className="ml-1 text-sm font-medium text-slate-500">pour toujours</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  <li>✓ Analyse rapide de CV (score, forces, recommandations)</li>
                  <li>✓ Sans création de compte</li>
                  <li className="flex items-center gap-1.5">
                    <Link
                      href="/signup"
                      className="font-medium text-gold-700 underline decoration-gold-300 underline-offset-2"
                    >
                      Créer un compte
                    </Link>
                    pour débloquer :
                  </li>
                  <li className="text-slate-500">✓ Matching offres d’emploi</li>
                  <li className="text-slate-500">✓ Simulations d’entretien</li>
                  <li className="text-slate-500">✓ Bibliothèque de CVs & historique</li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-3 text-center text-sm font-bold text-slate-950 shadow-md transition-all hover:from-gold-500 hover:to-gold-600"
                >
                  Créer un compte gratuitement
                </Link>
              </div>

              {/* Premium plan (teaser) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white shadow-md ring-1 ring-gold-500/40">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">Premium</h3>
                  <span className="rounded-full bg-gold-500/20 px-2.5 py-0.5 text-xs font-semibold text-gold-300">
                    Bientôt
                  </span>
                </div>
                <p className="mt-3 text-4xl font-extrabold">
                  —
                  <span className="ml-1 text-sm font-medium text-slate-400">à venir</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-300">
                  <li>✓ Analyses approfondies illimitées</li>
                  <li>✓ Matching d’offres avancé</li>
                  <li>✓ Entretiens illimités avec suivi</li>
                  <li>✓ Export PDF & lettres de motivation</li>
                </ul>
                <p className="mt-8 rounded-lg border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-400">
                  Inscrivez-vous pour être notifié
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* À propos + final CTA */}
        <section
          id="a-propos"
          className="scroll-mt-24 border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
              À propos
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              La carrière n’attend pas
            </h2>
            <p className="mt-4 text-base text-slate-600">
              AI Career Coach est un coach de carrière assisté par IA : analysez votre CV,
              confrontez-le aux offres qui vous ciblent et entraînez-vous à l’entretien —
              tout ce qu’un bon coach ferait, disponible immédiatement, à votre rythme.
              Votre première analyse est gratuite et éphémère : nous ne conservons rien
              tant que vous ne créez pas de compte.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition-all hover:from-gold-500 hover:to-gold-600"
              >
                Créer votre compte gratuit
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gold-100 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AI Career Coach. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-xs text-slate-500">
            <Link href="#accueil" className="transition-colors hover:text-gold-700">
              Accueil
            </Link>
            <Link href="#services" className="transition-colors hover:text-gold-700">
              Services
            </Link>
            <Link href="/login" className="transition-colors hover:text-gold-700">
              Sign In
            </Link>
            <Link href="/signup" className="transition-colors hover:text-gold-700">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
