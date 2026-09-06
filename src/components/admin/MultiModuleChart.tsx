'use client';

import { useState } from 'react';
import type { DailyModuleActivity } from '@/types/admin';

interface MultiModuleChartProps {
  data: DailyModuleActivity[];
  title?: string;
  className?: string;
}

const SERIES = [
  { key: 'quickTests' as const, label: 'Quick Tests CV', color: '#FF7A00', activeColor: 'bg-orange-500' },
  { key: 'signups' as const, label: 'Inscriptions', color: '#3B82F6', activeColor: 'bg-blue-500' },
  { key: 'matchings' as const, label: 'Job Matchings', color: '#10B981', activeColor: 'bg-emerald-500' },
  { key: 'interviews' as const, label: 'Entretiens IA', color: '#8B5CF6', activeColor: 'bg-purple-500' },
];

export default function MultiModuleChart({
  data,
  title = 'Activité Multi-Modules (14 derniers jours)',
  className = '',
}: MultiModuleChartProps) {
  const [activeSeries, setActiveSeries] = useState<Set<string>>(
    new Set(['quickTests', 'signups', 'matchings', 'interviews'])
  );
  const [hoveredDay, setHoveredDay] = useState<DailyModuleActivity | null>(null);

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const maxDaily = Math.max(
    1,
    ...data.map((d) =>
      (activeSeries.has('quickTests') ? d.quickTests : 0) +
      (activeSeries.has('signups') ? d.signups : 0) +
      (activeSeries.has('matchings') ? d.matchings : 0) +
      (activeSeries.has('interviews') ? d.interviews : 0)
    )
  );

  return (
    <div className={`rounded-2xl border border-navy-100 bg-white p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header & Series Toggles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-navy-100/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          <p className="text-xs text-navy-500 mt-0.5">
            Suivi consolidé de l’utilisation des fonctionnalités clés
          </p>
        </div>

        {/* Legend toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {SERIES.map((s) => {
            const isEnabled = activeSeries.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleSeries(s.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isEnabled
                    ? 'bg-navy-50 text-navy-900 border-navy-200'
                    : 'bg-white text-navy-400 border-navy-100 opacity-60'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: isEnabled ? s.color : '#94A3B8' }}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover Info Tooltip Header */}
      <div className="h-6 flex items-center justify-between text-xs text-navy-600 mt-2 px-1">
        {hoveredDay ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-navy-900">{hoveredDay.date}</span>
            {activeSeries.has('quickTests') && (
              <span className="text-orange-600">Tests: {hoveredDay.quickTests}</span>
            )}
            {activeSeries.has('signups') && (
              <span className="text-blue-600">Inscr.: {hoveredDay.signups}</span>
            )}
            {activeSeries.has('matchings') && (
              <span className="text-emerald-600">Matchs: {hoveredDay.matchings}</span>
            )}
            {activeSeries.has('interviews') && (
              <span className="text-purple-600">Visios: {hoveredDay.interviews}</span>
            )}
          </div>
        ) : (
          <span className="text-navy-400 italic">Survolez un jour pour les détails</span>
        )}
      </div>

      {/* Stacked Bars Graph */}
      <div className="mt-3 flex h-48 items-end gap-1.5 sm:gap-2.5 pt-4">
        {data.map((day) => {
          const quickTests = activeSeries.has('quickTests') ? day.quickTests : 0;
          const signups = activeSeries.has('signups') ? day.signups : 0;
          const matchings = activeSeries.has('matchings') ? day.matchings : 0;
          const interviews = activeSeries.has('interviews') ? day.interviews : 0;
          const total = quickTests + signups + matchings + interviews;
          const heightPercent = total > 0 ? Math.max(6, Math.round((total / maxDaily) * 100)) : 2;

          return (
            <div
              key={day.date}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              className="group relative flex h-full flex-1 flex-col justify-end items-center cursor-pointer"
            >
              {/* Stacked bar segments */}
              <div
                className="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-110 shadow-xs"
                style={{ height: `${heightPercent}%` }}
              >
                {quickTests > 0 && (
                  <div
                    style={{ height: `${(quickTests / total) * 100}%`, backgroundColor: '#FF7A00' }}
                    title={`Tests: ${quickTests}`}
                  />
                )}
                {signups > 0 && (
                  <div
                    style={{ height: `${(signups / total) * 100}%`, backgroundColor: '#3B82F6' }}
                    title={`Inscriptions: ${signups}`}
                  />
                )}
                {matchings > 0 && (
                  <div
                    style={{ height: `${(matchings / total) * 100}%`, backgroundColor: '#10B981' }}
                    title={`Matchings: ${matchings}`}
                  />
                )}
                {interviews > 0 && (
                  <div
                    style={{ height: `${(interviews / total) * 100}%`, backgroundColor: '#8B5CF6' }}
                    title={`Entretiens: ${interviews}`}
                  />
                )}
                {total === 0 && <div className="h-full w-full bg-navy-100/60 rounded-t-sm" />}
              </div>

              {/* Day label */}
              <span className="mt-2 text-[10px] font-medium text-navy-400 group-hover:text-navy-900 transition-colors">
                {day.date.slice(8)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
