import Skeleton from './Skeleton';

/**
 * Chart 4 — dedicated loading skeletons for every asynchronous dashboard /
 * admin segment (used by the `loading.tsx` convention files).
 *
 * Each skeleton mirrors the exact container classes of the page it stands in
 * for (paddings, max-width, grid structure and — where it matters — fixed
 * heights such as the 600px document preview), so the swap from skeleton to
 * real content happens without any layout shift (CLS ≈ 0).
 *
 * These are pure server components (no hooks) and lean on the shared shimmer
 * `Skeleton` primitive — no generic spinners.
 */

/** One rounded content card placeholder. */
function CardSkeleton({ className = '' }: { className?: string }) {
  return <Skeleton className={`rounded-2xl border border-slate-200/70 ${className}`} />;
}

/** Title + subtitle lines, mirroring the page headers. */
function HeaderLines({ titleWidth = 'w-64' }: { titleWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-7 ${titleWidth}`} />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Label + input row, mirroring the profile/settings form fields. */
function FieldRowSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

/**
 * Dashboard home — template grid: welcome header, roadmap board card,
 * profile-overview card and the CV cards row (DashboardView layout).
 */
export function DashboardHomeSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du tableau de bord"
      className="flex flex-col gap-6 sm:gap-7"
    >
      <HeaderLines titleWidth="w-80" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <CardSkeleton className="h-96 xl:col-span-2" />
        <CardSkeleton className="h-96" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton className="h-44" />
        <CardSkeleton className="h-44" />
        <CardSkeleton className="h-44" />
      </div>
    </div>
  );
}

/** CVs / matching grids — same wrapper classes as their pages. */
export function CardGridPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Chargement" className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <HeaderLines titleWidth="w-56" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }, (_, index) => (
            <CardSkeleton key={index} className="h-44" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Profile management — form sections on the brand background. */
export function ProfileFormSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du profil"
      className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <HeaderLines titleWidth="w-72" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>

        {[0, 1, 2].map((section) => (
          <div
            key={section}
            className="rounded-2xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <Skeleton className="h-5 w-44" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FieldRowSkeleton />
              <FieldRowSkeleton />
              <FieldRowSkeleton />
              <FieldRowSkeleton />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Immersive career roadmap — panoramic board + timeline grid. */
export function RoadmapSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement de la roadmap"
      className="flex flex-col gap-6 sm:gap-7"
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
      </div>

      <CardSkeleton className="h-[420px]" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton className="h-40" />
        <CardSkeleton className="h-40" />
        <CardSkeleton className="h-40" />
      </div>
    </div>
  );
}

/** Analytics — KPI cards, progress panel and content block. */
export function AnalyticsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement des analytics"
      className="flex flex-1 flex-col gap-6 sm:gap-7"
    >
      <HeaderLines titleWidth="w-72" />

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-24" />
      </div>

      <CardSkeleton className="h-40" />
      <CardSkeleton className="h-64 flex-1" />
    </div>
  );
}

/** Settings — same root flex layout as SettingsView. */
export function SettingsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement des paramètres"
      className="flex flex-1 flex-col gap-6 pb-16 sm:gap-7"
    >
      <HeaderLines titleWidth="w-56" />
      <CardSkeleton className="h-48" />
      <CardSkeleton className="h-64" />
    </div>
  );
}

/** Mock interviews — header + session cards in the main canvas. */
export function MockSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement des simulations"
      className="flex flex-1 flex-col gap-6 sm:gap-7"
    >
      <HeaderLines titleWidth="w-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CardSkeleton className="h-52" />
        <CardSkeleton className="h-52" />
        <CardSkeleton className="h-52" />
        <CardSkeleton className="h-52" />
      </div>
    </div>
  );
}

/** Resume catalogue — upload card + CV list grid (page container included). */
export function ResumeCatalogueSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du catalogue de CVs"
      className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <HeaderLines titleWidth="w-64" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="mt-3 h-10 w-full rounded-md" />
          <Skeleton className="mt-3 h-10 w-2/3 rounded-md" />
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm sm:p-8">
          <Skeleton className="h-5 w-40" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <CardSkeleton className="h-32 rounded-xl" />
            <CardSkeleton className="h-32 rounded-xl" />
            <CardSkeleton className="h-32 rounded-xl" />
            <CardSkeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Resume detail — the preview column keeps the exact 600px height of the real
 * PDF iframe so the swap never shifts the metadata sidebar (CLS ≈ 0).
 */
export function ResumeDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement de l'aperçu du CV"
      className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-80 max-w-full" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-4 h-[600px] w-full rounded-lg" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
              <Skeleton className="h-5 w-28" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <CardSkeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Admin back-office — stat cards + table block. */
export function AdminSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="space-y-6">
      <HeaderLines titleWidth="w-72" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton className="h-28" />
        <CardSkeleton className="h-28" />
        <CardSkeleton className="h-28" />
        <CardSkeleton className="h-28" />
      </div>

      <CardSkeleton className="h-80" />
    </div>
  );
}
