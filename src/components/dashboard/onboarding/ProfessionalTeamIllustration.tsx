'use client';

import React from 'react';

/**
 * High-end responsive vector illustration depicting two tech/business professionals
 * (a woman and a man) in the ForPro AI theme (Deep Navy, Slate Blue, Vibrant Orange #FF7A00).
 * Features animated floating career metrics (ATS score, Job match, Voice STAR coach, Career milestone).
 */
export default function ProfessionalTeamIllustration({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Inline animations scoped to the vector scene */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float-badge-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes float-badge-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }
        @keyframes float-badge-3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes forpro-aura-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.04); }
        }
        @keyframes forpro-glow-ring {
          0%, 100% { stroke-dashoffset: 0; }
          50% { stroke-dashoffset: 40; }
        }
        @keyframes soundwave-bar {
          0%, 100% { height: 6px; }
          50% { height: 16px; }
        }
      `,
        }}
      />

      <svg
        viewBox="0 0 620 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[290px] sm:max-h-[340px] drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Background Aura Gradients */}
          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF7A00" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#1E3A8A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0B1528" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="womanBlazer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A2D4C" />
            <stop offset="100%" stopColor="#0E1A2E" />
          </linearGradient>

          <linearGradient id="manSuit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3354" />
            <stop offset="100%" stopColor="#0F1D32" />
          </linearGradient>

          <linearGradient id="orangeAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FFA040" />
          </linearGradient>

          <linearGradient id="tabletScreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B1728" />
            <stop offset="100%" stopColor="#162744" />
          </linearGradient>

          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Dynamic Background Glow Aura */}
        <ellipse
          cx="310"
          cy="190"
          rx="250"
          ry="150"
          fill="url(#auraGlow)"
          style={{ animation: 'forpro-aura-pulse 6s ease-in-out infinite' }}
        />

        {/* Orbit Grid Arc */}
        <path
          d="M 60 270 Q 310 110 560 270"
          stroke="#FF7A00"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeOpacity="0.35"
          fill="none"
        />

        {/* ------------------------------------------------------------------ */}
        {/* CHARACTER 1 (WOMAN) — Left: Tech Lead / Consultant                 */}
        {/* ------------------------------------------------------------------ */}
        <g id="woman-character" transform="translate(145, 75)">
          {/* Subtle Silhouette Glow */}
          <ellipse cx="65" cy="180" rx="65" ry="30" fill="#0B1528" fillOpacity="0.6" />

          {/* Body / Blazer */}
          <path
            d="M 20 250 L 35 155 Q 65 145 95 155 L 110 250 Z"
            fill="url(#womanBlazer)"
            stroke="#2A3F60"
            strokeWidth="1.5"
          />

          {/* Lapel & Blouse */}
          <path d="M 45 155 L 65 210 L 85 155" fill="#FFFFFF" fillOpacity="0.9" />
          <path d="M 50 170 L 65 230 L 80 170" fill="#0F1F38" />

          {/* Lanyard & ForPro AI Badge */}
          <path d="M 58 160 L 65 205 L 72 160" stroke="#FF7A00" strokeWidth="2" fill="none" />
          <rect x="60" y="205" width="10" height="14" rx="2" fill="#FF7A00" />
          <circle cx="65" cy="210" r="1.5" fill="#FFFFFF" />

          {/* Neck */}
          <path d="M 54 125 L 54 150 Q 65 155 76 150 L 76 125 Z" fill="#F8C8A0" />

          {/* Face */}
          <path
            d="M 46 95 Q 46 135 65 135 Q 84 135 84 95 Q 84 65 65 65 Q 46 65 46 95 Z"
            fill="#FED7B2"
          />

          {/* Hair - Stylish Professional Brunette with Amber highlights */}
          <path
            d="M 40 90 Q 40 45 65 45 Q 90 45 90 90 Q 94 135 92 155 L 82 150 Q 84 105 82 85 Q 65 80 48 85 Q 46 105 48 150 L 38 155 Q 36 135 40 90 Z"
            fill="#3B2314"
          />
          {/* Hair Accent Highlight */}
          <path d="M 50 60 Q 65 52 80 62" stroke="#FF7A00" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

          {/* Tablet / Digital Dashboard in Hands */}
          <g transform="translate(18, 185)" filter="url(#softShadow)">
            <rect
              x="0"
              y="0"
              width="60"
              height="44"
              rx="6"
              fill="url(#tabletScreen)"
              stroke="#FF7A00"
              strokeWidth="1.5"
            />
            {/* Holographic Bars on Tablet */}
            <rect x="8" y="10" width="26" height="4" rx="2" fill="#FF7A00" />
            <rect x="8" y="18" width="44" height="3" rx="1.5" fill="#38BDF8" fillOpacity="0.8" />
            <rect x="8" y="25" width="34" height="3" rx="1.5" fill="#34D399" fillOpacity="0.8" />
            <circle cx="48" cy="12" r="3" fill="#FF7A00" />
          </g>
        </g>

        {/* ------------------------------------------------------------------ */}
        {/* CHARACTER 2 (MAN) — Right: Senior Engineer / Tech Executive        */}
        {/* ------------------------------------------------------------------ */}
        <g id="man-character" transform="translate(335, 65)">
          {/* Silhouette Glow */}
          <ellipse cx="75" cy="190" rx="70" ry="30" fill="#0B1528" fillOpacity="0.6" />

          {/* Shoulders & Jacket */}
          <path
            d="M 20 260 L 40 160 Q 75 148 110 160 L 130 260 Z"
            fill="url(#manSuit)"
            stroke="#283E62"
            strokeWidth="1.5"
          />

          {/* Shirt & Tie */}
          <path d="M 58 160 L 75 220 L 92 160" fill="#FFFFFF" fillOpacity="0.9" />
          <path d="M 72 170 L 75 235 L 78 170" fill="#FF7A00" />

          {/* Neck */}
          <path d="M 64 125 L 64 152 Q 75 156 86 152 L 86 125 Z" fill="#E8B58D" />

          {/* Head & Face */}
          <path
            d="M 54 85 Q 54 130 75 130 Q 96 130 96 85 Q 96 55 75 55 Q 54 55 54 85 Z"
            fill="#F4C7A3"
          />

          {/* Neat Modern Hair & Beard */}
          <path
            d="M 52 75 Q 52 45 75 45 Q 98 45 98 75 Q 98 85 96 90 Q 75 75 54 90 Q 52 85 52 75 Z"
            fill="#1E293B"
          />
          <path
            d="M 59 110 Q 75 132 91 110 Q 92 118 86 126 Q 75 134 64 126 Q 58 118 59 110 Z"
            fill="#1E293B"
            opacity="0.85"
          />

          {/* Modern Glasses (Tech / Pro look) */}
          <rect x="58" y="80" width="13" height="8" rx="2" stroke="#FF7A00" strokeWidth="1.5" fill="#FF7A00" fillOpacity="0.1" />
          <rect x="79" y="80" width="13" height="8" rx="2" stroke="#FF7A00" strokeWidth="1.5" fill="#FF7A00" fillOpacity="0.1" />
          <line x1="71" y1="84" x2="79" y2="84" stroke="#FF7A00" strokeWidth="1.5" />

          {/* Smart Device in Hand */}
          <g transform="translate(85, 195)" filter="url(#softShadow)">
            <rect
              x="0"
              y="0"
              width="36"
              height="50"
              rx="6"
              fill="#0F1E36"
              stroke="#38BDF8"
              strokeWidth="1.2"
            />
            {/* Hologram Flag Output */}
            <path d="M 12 12 L 24 16 L 12 20 Z" fill="#FF7A00" />
            <line x1="12" y1="12" x2="12" y2="35" stroke="#FF7A00" strokeWidth="2" />
            <circle cx="18" cy="40" r="3" fill="#38BDF8" />
          </g>
        </g>

        {/* ------------------------------------------------------------------ */}
        {/* FLOATING INTERACTIVE BADGES (Micro-animated)                       */}
        {/* ------------------------------------------------------------------ */}

        {/* Badge 1: Top-Left — ATS CV Score */}
        <g
          filter="url(#softShadow)"
          style={{
            animation: 'float-badge-1 4.5s ease-in-out infinite',
            transformOrigin: '90px 80px',
          }}
        >
          <rect
            x="25"
            y="55"
            width="145"
            height="50"
            rx="14"
            fill="#091424"
            stroke="#FF7A00"
            strokeWidth="1.5"
            fillOpacity="0.92"
          />
          {/* Icon Circle */}
          <circle cx="50" cy="80" r="14" fill="#FF7A00" fillOpacity="0.15" stroke="#FF7A00" strokeWidth="1" />
          {/* File Icon */}
          <path d="M 45 74 L 52 74 L 55 77 L 55 86 L 45 86 Z" stroke="#FF7A00" strokeWidth="1.5" fill="none" />
          <text x="72" y="74" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            SCORE ATS
          </text>
          <text x="72" y="91" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="sans-serif">
            94% <tspan fill="#34D399" fontSize="10">Excellent</tspan>
          </text>
        </g>

        {/* Badge 2: Top-Right — Job Match Score */}
        <g
          filter="url(#softShadow)"
          style={{
            animation: 'float-badge-2 5.2s ease-in-out infinite',
            transformOrigin: '510px 75px',
          }}
        >
          <rect
            x="440"
            y="50"
            width="155"
            height="52"
            rx="14"
            fill="#091424"
            stroke="#38BDF8"
            strokeWidth="1.5"
            fillOpacity="0.92"
          />
          {/* Target Icon Circle */}
          <circle cx="466" cy="76" r="14" fill="#38BDF8" fillOpacity="0.15" stroke="#38BDF8" strokeWidth="1" />
          <circle cx="466" cy="76" r="6" stroke="#38BDF8" strokeWidth="1.5" />
          <circle cx="466" cy="76" r="2" fill="#38BDF8" />
          <text x="490" y="70" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            MATCHING IA
          </text>
          <text x="490" y="87" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="sans-serif">
            98% <tspan fill="#FF7A00" fontSize="10">Lead Tech</tspan>
          </text>
        </g>

        {/* Badge 3: Bottom-Left — Voice AI Interview / STAR */}
        <g
          filter="url(#softShadow)"
          style={{
            animation: 'float-badge-3 4s ease-in-out infinite 0.5s',
            transformOrigin: '90px 240px',
          }}
        >
          <rect
            x="35"
            y="215"
            width="145"
            height="46"
            rx="12"
            fill="#091424"
            stroke="#A855F7"
            strokeWidth="1.3"
            fillOpacity="0.92"
          />
          {/* Mic / Audio Circle */}
          <circle cx="58" cy="238" r="12" fill="#A855F7" fillOpacity="0.15" stroke="#A855F7" strokeWidth="1" />
          {/* Mini Soundwave */}
          <g transform="translate(52, 230)">
            <rect x="2" y="5" width="2" height="6" rx="1" fill="#A855F7" />
            <rect x="5" y="2" width="2" height="12" rx="1" fill="#FF7A00" />
            <rect x="8" y="0" width="2" height="16" rx="1" fill="#A855F7" />
            <rect x="11" y="4" width="2" height="8" rx="1" fill="#38BDF8" />
          </g>
          <text x="78" y="232" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            COACH VOCAL IA
          </text>
          <text x="78" y="247" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="sans-serif">
            Débrief STAR prêt
          </text>
        </g>

        {/* Badge 4: Bottom-Right — Career Milestones Flag */}
        <g
          filter="url(#softShadow)"
          style={{
            animation: 'float-badge-1 4.8s ease-in-out infinite 1s',
            transformOrigin: '515px 235px',
          }}
        >
          <rect
            x="445"
            y="215"
            width="150"
            height="46"
            rx="12"
            fill="#091424"
            stroke="#10B981"
            strokeWidth="1.3"
            fillOpacity="0.92"
          />
          {/* Flag Circle */}
          <circle cx="468" cy="238" r="12" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1" />
          <path d="M 464 244 L 464 232 L 472 235 L 464 238 Z" fill="#10B981" />
          <text x="488" y="232" fill="#94A3B8" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            ROADMAP PRO
          </text>
          <text x="488" y="247" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="sans-serif">
            Objectif 2030 Décroché
          </text>
        </g>

        {/* Glowing Energy Sparks */}
        <circle cx="285" cy="95" r="2.5" fill="#FF7A00" opacity="0.8" />
        <circle cx="340" cy="105" r="2" fill="#38BDF8" opacity="0.8" />
        <circle cx="310" cy="285" r="3" fill="#FFA040" opacity="0.9" />
      </svg>
    </div>
  );
}
