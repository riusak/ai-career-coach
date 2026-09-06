'use client';

import { ShieldCheck, Lock, Activity, Ban, FileWarning, CheckCircle2 } from 'lucide-react';
import type { AdminSecurityMetrics } from '@/types/admin';

interface SecurityTelemetryCardProps {
  metrics: AdminSecurityMetrics;
  className?: string;
}

export default function SecurityTelemetryCard({
  metrics,
  className = '',
}: SecurityTelemetryCardProps) {
  return (
    <div className={`rounded-2xl border border-navy-100 bg-white p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-navy-100/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-navy-900">
                Sécurité & Protection Cyber
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Opérationnel
              </span>
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              Télémétrie en direct des défenses anti-abus, rate limits et filtrage
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Security KPIs */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3.5">
          <div className="flex items-center gap-2 text-navy-600 text-xs font-semibold">
            <Ban className="h-4 w-4 text-orange-600" />
            <span>Tentatives Bloquées</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-navy-900">
            {metrics.blockedAttemptsCount}
          </div>
          <p className="text-[11px] text-navy-500 mt-0.5">
            Floods & dépassements de quota
          </p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3.5">
          <div className="flex items-center gap-2 text-navy-600 text-xs font-semibold">
            <FileWarning className="h-4 w-4 text-amber-600" />
            <span>Fichiers Non-CV Rejetés</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-navy-900">
            {metrics.nonCvRejections}
          </div>
          <p className="text-[11px] text-navy-500 mt-0.5">
            Guardrail LLM (factures, scripts)
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3.5">
          <div className="flex items-center gap-2 text-navy-600 text-xs font-semibold">
            <Lock className="h-4 w-4 text-blue-600" />
            <span>Routes Protégées</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-navy-900">
            {metrics.rateLimitProtectedEndpoints} endpoints
          </div>
          <p className="text-[11px] text-navy-500 mt-0.5">
            Token bucket & RLS strict
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-3.5">
          <div className="flex items-center gap-2 text-navy-600 text-xs font-semibold">
            <Activity className="h-4 w-4 text-purple-600" />
            <span>Audit Trail Logs</span>
          </div>
          <div className="mt-2 text-xl font-extrabold text-navy-900">
            {metrics.securityAuditEventsCount}
          </div>
          <p className="text-[11px] text-navy-500 mt-0.5">
            Événements sécurisés tracés
          </p>
        </div>
      </div>

      {/* Active Defenses Checklist */}
      <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
          Couches de Défense Actives & Conformité
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-800">
          {metrics.activeDefenses.map((defense) => (
            <div key={defense} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{defense}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
