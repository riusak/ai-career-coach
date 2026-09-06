'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { InterviewEmotion, InterviewerId } from '@/types/interview';

interface AnimatedRecruiterAvatarProps {
  speakerId: InterviewerId;
  avatarSeed?: string;
  emotion?: InterviewEmotion;
  isSpeaking: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Deterministic hash helper for archetype selection
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

export default function AnimatedRecruiterAvatar({
  speakerId,
  avatarSeed,
  emotion = 'smiling',
  isSpeaking,
  size = 'lg',
  className = '',
}: AnimatedRecruiterAvatarProps) {
  // Natural random blinking cycle
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 140);

      // Next blink in 2.6 to 4.8 seconds
      const nextDelay = 2600 + Math.random() * 2200;
      timeoutId = setTimeout(triggerBlink, nextDelay);
    };

    timeoutId = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(timeoutId);
  }, []);

  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-36 h-40',
    lg: 'w-48 h-56',
    xl: 'w-64 h-72',
  }[size];

  // Determine avatar style profile based on seed or speakerId
  const seedKey = avatarSeed || speakerId || 'alisor';
  const seedVal = hashSeed(seedKey);

  // Determine gender/archetype
  // Alisor => Archetype 0 (Female HR executive, warm amber/terracotta palette, elegant blazer)
  // Marc => Archetype 1 (Male Tech architect, crisp navy suit, minimalist tech glasses)
  // Others => Dynamic based on seedVal (4 archetypes)
  const isHardcodedAlisor = speakerId.toLowerCase() === 'alisor' || speakerId.toLowerCase().includes('rh');
  const isHardcodedMarc = speakerId.toLowerCase() === 'marc' || speakerId.toLowerCase().includes('tech') || speakerId.toLowerCase().includes('directeur');

  let archetype = seedVal % 4;
  if (isHardcodedAlisor) archetype = 0;
  else if (isHardcodedMarc) archetype = 1;

  // Palettes per archetype
  const palettes = [
    // 0: Elegant Executive Woman (Warm / Coral / Terracotta tones)
    {
      skinTop: '#FBE4D5',
      skinBottom: '#ECC4A8',
      skinShadow: '#D89E7E',
      hairTop: '#3D2014',
      hairBottom: '#22110B',
      hairHighlight: '#5C3322',
      iris: '#5C381E',
      suitTop: '#1E293B',
      suitBottom: '#0F172A',
      shirt: '#0D9488',
      lapel: '#334155',
      accent: '#F59E0B',
      hasGlasses: false,
      hasBeard: false,
      isFemale: true,
      earring: true,
    },
    // 1: Modern Tech Leader Man (Slate / Sapphire tones)
    {
      skinTop: '#F6D5BA',
      skinBottom: '#E5B695',
      skinShadow: '#C89370',
      hairTop: '#1F2937',
      hairBottom: '#111827',
      hairHighlight: '#374151',
      iris: '#1E3A8A',
      suitTop: '#0F172A',
      suitBottom: '#020617',
      shirt: '#2563EB',
      lapel: '#1E293B',
      accent: '#38BDF8',
      hasGlasses: true,
      hasBeard: true,
      isFemale: false,
      earring: false,
    },
    // 2: Dynamic Senior Specialist Woman (Rich Deep Chestnut / Emerald tones)
    {
      skinTop: '#8D5B4C',
      skinBottom: '#6F4133',
      skinShadow: '#573024',
      hairTop: '#171717',
      hairBottom: '#0A0A0A',
      hairHighlight: '#262626',
      iris: '#3B2F2F',
      suitTop: '#064E3B',
      suitBottom: '#022C22',
      shirt: '#F8FAFC',
      lapel: '#047857',
      accent: '#FCD34D',
      hasGlasses: false,
      hasBeard: false,
      isFemale: true,
      earring: true,
    },
    // 3: VP & Senior Manager Man (Golden Brown / Midnight Indigo tones)
    {
      skinTop: '#E2B895',
      skinBottom: '#C5936E',
      skinShadow: '#A7734E',
      hairTop: '#27272A',
      hairBottom: '#18181B',
      hairHighlight: '#3F3F46',
      iris: '#292524',
      suitTop: '#1E1B4B',
      suitBottom: '#0F0E2A',
      shirt: '#E0E7FF',
      lapel: '#312E81',
      accent: '#818CF8',
      hasGlasses: false,
      hasBeard: true,
      isFemale: false,
      earring: false,
    },
  ];

  const p = palettes[archetype];
  const uid = `av-${seedKey.replace(/[^a-z0-9]/gi, '_')}`;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
      aria-label={`Avatar recruteur`}
    >
      <motion.svg
        viewBox="0 0 240 280"
        className="w-full h-full drop-shadow-xl"
        animate={{
          y: isSpeaking ? [0, -3.5, 1, -2, 0] : [0, -1.8, 0],
          rotate: isSpeaking
            ? emotion === 'curious'
              ? [0.5, 2, 0.5, 1.5]
              : [0, 0.7, -0.5, 0]
            : emotion === 'thoughtful'
            ? 1.2
            : 0,
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: isSpeaking ? 1.3 : 3.8,
            ease: 'easeInOut',
          },
          rotate: {
            repeat: isSpeaking ? Infinity : 0,
            duration: isSpeaking ? 1.7 : 0.6,
            ease: 'easeInOut',
          },
        }}
      >
        <defs>
          {/* Subtle skin gradient */}
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.skinTop} />
            <stop offset="100%" stopColor={p.skinBottom} />
          </linearGradient>

          {/* Hair Gradient */}
          <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={p.hairTop} />
            <stop offset="100%" stopColor={p.hairBottom} />
          </linearGradient>

          {/* Suit Gradient */}
          <linearGradient id={`${uid}-suit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.suitTop} />
            <stop offset="100%" stopColor={p.suitBottom} />
          </linearGradient>

          {/* Ambient Lighting Glow */}
          <radialGradient id={`${uid}-glow`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Soft Shadow Filter */}
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* 1. Body & Elegant Business Attire */}
        <g>
          {/* Shoulders & Jacket Silhouette */}
          <path
            d="M 24 280 C 24 212, 70 192, 120 192 C 170 192, 216 212, 216 280 Z"
            fill={`url(#${uid}-suit)`}
          />
          {/* Soft lighting overlay across shoulders */}
          <path
            d="M 24 280 C 24 212, 70 192, 120 192 C 170 192, 216 212, 216 280 Z"
            fill={`url(#${uid}-glow)`}
          />

          {/* Inner Shirt / Top */}
          <path
            d="M 92 192 L 120 238 L 148 192 Z"
            fill={p.shirt}
            opacity="0.96"
          />

          {/* Left & Right Suit Lapels */}
          <path
            d="M 78 192 L 118 256 L 102 280 L 65 280 Z"
            fill={p.lapel}
            opacity="0.9"
          />
          <path
            d="M 162 192 L 122 256 L 138 280 L 175 280 Z"
            fill={p.lapel}
            opacity="0.8"
          />

          {/* Neck Column */}
          <path
            d="M 97 146 L 97 196 C 111 204, 129 204, 143 196 L 143 146 Z"
            fill={`url(#${uid}-skin)`}
          />
          {/* Chin Shadow on Neck */}
          <path
            d="M 97 148 C 110 160, 130 160, 143 148 L 143 162 C 130 170, 110 170, 97 162 Z"
            fill={p.skinShadow}
            opacity="0.45"
          />
        </g>

        {/* 2. Head, Ears & Refined Facial Structure */}
        <g>
          {/* Ears with soft inner shading */}
          <ellipse
            cx="66"
            cy="123"
            rx="8.5"
            ry="13.5"
            fill={`url(#${uid}-skin)`}
          />
          <ellipse
            cx="66"
            cy="123"
            rx="4.5"
            ry="7.5"
            fill={p.skinShadow}
            opacity="0.3"
          />

          <ellipse
            cx="174"
            cy="123"
            rx="8.5"
            ry="13.5"
            fill={`url(#${uid}-skin)`}
          />
          <ellipse
            cx="174"
            cy="123"
            rx="4.5"
            ry="7.5"
            fill={p.skinShadow}
            opacity="0.3"
          />

          {/* Earrings for female archetypes */}
          {p.earring && (
            <>
              <circle cx="66" cy="138" r="3.2" fill={p.accent} />
              <circle cx="66" cy="138" r="1.5" fill="#FFF" opacity="0.6" />
              <circle cx="174" cy="138" r="3.2" fill={p.accent} />
              <circle cx="174" cy="138" r="1.5" fill="#FFF" opacity="0.6" />
            </>
          )}

          {/* Smooth Ergonomic Head Shape */}
          <path
            d="M 72 106 C 72 58, 168 58, 168 106 C 168 146, 150 168, 120 168 C 90 168, 72 146, 72 106 Z"
            fill={`url(#${uid}-skin)`}
            filter={`url(#${uid}-shadow)`}
          />

          {/* Subtle natural beard/stubble for male archetypes */}
          {p.hasBeard && (
            <path
              d="M 80 126 C 80 162, 98 169, 120 169 C 142 169, 160 162, 160 126 C 160 138, 146 148, 120 148 C 94 148, 80 138, 80 126 Z"
              fill={p.hairBottom}
              opacity="0.18"
            />
          )}

          {/* Natural Cheek Warmth */}
          <ellipse
            cx="88"
            cy="133"
            rx="9"
            ry="5.5"
            fill="#FB7185"
            opacity={emotion === 'smiling' ? 0.32 : 0.16}
          />
          <ellipse
            cx="152"
            cy="133"
            rx="9"
            ry="5.5"
            fill="#FB7185"
            opacity={emotion === 'smiling' ? 0.32 : 0.16}
          />
        </g>

        {/* 3. Refined Eyebrows with Emotion Nuances */}
        <g>
          {/* Left Eyebrow */}
          <motion.path
            d={
              emotion === 'curious'
                ? 'M 86 94 Q 101 89, 114 94'
                : emotion === 'skeptical'
                ? 'M 86 99 Q 101 100, 114 101'
                : 'M 86 97 Q 101 92, 114 96'
            }
            stroke={p.hairTop}
            strokeWidth={p.isFemale ? '2.8' : '3.6'}
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Eyebrow */}
          <motion.path
            d={
              emotion === 'curious'
                ? 'M 126 96 Q 139 94, 154 98'
                : emotion === 'skeptical'
                ? 'M 126 94 Q 139 88, 154 93'
                : 'M 126 96 Q 139 92, 154 97'
            }
            stroke={p.hairTop}
            strokeWidth={p.isFemale ? '2.8' : '3.6'}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 4. Natural Expressive Eyes */}
        <g>
          {/* Left Eye */}
          {isBlinking ? (
            <path
              d="M 88 113 Q 101 117, 114 113"
              stroke={p.hairBottom}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g>
              <ellipse cx="101" cy="112" rx="8" ry="6.5" fill="#FFFFFF" />
              {/* Iris */}
              <circle
                cx={emotion === 'thoughtful' ? '99.5' : '101'}
                cy="112"
                r="4.2"
                fill={p.iris}
              />
              <circle cx="101" cy="112" r="2" fill="#0F172A" />
              {/* Specular Catchlight */}
              <circle cx="99.5" cy="110.5" r="1.4" fill="#FFFFFF" />
              <circle cx="102.5" cy="113.5" r="0.7" fill="#FFFFFF" opacity="0.8" />
              {/* Eyelash accent for female */}
              {p.isFemale && (
                <path
                  d="M 90 109 Q 101 105, 112 109"
                  stroke={p.hairBottom}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Right Eye */}
          {isBlinking ? (
            <path
              d="M 126 113 Q 139 117, 152 113"
              stroke={p.hairBottom}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g>
              <ellipse cx="139" cy="112" rx="8" ry="6.5" fill="#FFFFFF" />
              {/* Iris */}
              <circle
                cx={emotion === 'thoughtful' ? '137.5' : '139'}
                cy="112"
                r="4.2"
                fill={p.iris}
              />
              <circle cx="139" cy="112" r="2" fill="#0F172A" />
              {/* Specular Catchlight */}
              <circle cx="137.5" cy="110.5" r="1.4" fill="#FFFFFF" />
              <circle cx="140.5" cy="113.5" r="0.7" fill="#FFFFFF" opacity="0.8" />
              {/* Eyelash accent for female */}
              {p.isFemale && (
                <path
                  d="M 128 109 Q 139 105, 150 109"
                  stroke={p.hairBottom}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Minimalist Tech Glasses if enabled */}
          {p.hasGlasses && (
            <g>
              <rect
                x="87"
                y="102"
                width="28"
                height="20"
                rx="6"
                fill="none"
                stroke="#334155"
                strokeWidth="1.8"
              />
              <rect
                x="125"
                y="102"
                width="28"
                height="20"
                rx="6"
                fill="none"
                stroke="#334155"
                strokeWidth="1.8"
              />
              <path
                d="M 115 110 L 125 110"
                stroke="#334155"
                strokeWidth="1.8"
                fill="none"
              />
              {/* Subtle glass glare */}
              <line
                x1="91"
                y1="105"
                x2="100"
                y2="105"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.5"
              />
              <line
                x1="129"
                y1="105"
                x2="138"
                y2="105"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.5"
              />
            </g>
          )}
        </g>

        {/* 5. Natural Nose Contour */}
        <path
          d="M 119 116 Q 123 128, 118 132 Q 120 133, 122 133"
          stroke={p.skinShadow}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Dynamic Organic Mouth & Viseme Animation */}
        <g>
          {isSpeaking ? (
            <motion.path
              fill="#991B1B"
              stroke="#6B1212"
              strokeWidth="1.4"
              animate={{
                d: [
                  'M 108 146 Q 120 148, 132 146 Q 120 152, 108 146 Z', // slight open
                  'M 106 145 Q 120 144, 134 145 Q 120 158, 106 145 Z', // wide open
                  'M 110 146 Q 120 147, 130 146 Q 120 155, 110 146 Z', // rounded
                  'M 107 145 Q 120 149, 133 145 Q 120 151, 107 145 Z', // smiling articulation
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.52,
                ease: 'easeInOut',
              }}
            />
          ) : (
            <path
              d={
                emotion === 'smiling' || emotion === 'impressed'
                  ? 'M 107 145 Q 120 154, 133 145' // natural warm smile
                  : emotion === 'skeptical'
                  ? 'M 108 147 Q 120 147, 132 144'
                  : emotion === 'thoughtful'
                  ? 'M 110 146 Q 120 145, 130 146'
                  : 'M 108 145 Q 120 149, 132 145'
              }
              stroke={p.isFemale ? '#A83244' : '#6B3A1C'}
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>

        {/* 7. Beautiful Hair Styling per Archetype */}
        {p.isFemale ? (
          // Elegant executive styling (smooth flowing contour)
          <g>
            <path
              d="M 64 122 C 58 172, 70 205, 80 220 L 70 170 C 58 130, 66 82, 84 66 Z"
              fill={`url(#${uid}-hair)`}
            />
            <path
              d="M 176 122 C 182 172, 170 205, 160 220 L 170 170 C 182 130, 174 82, 156 66 Z"
              fill={`url(#${uid}-hair)`}
            />
            {/* Crown & flowing forehead wave */}
            <path
              d="M 68 106 C 64 48, 176 48, 172 106 C 160 80, 134 76, 118 82 C 98 76, 78 82, 68 106 Z"
              fill={`url(#${uid}-hair)`}
            />
            {/* Soft highlight strand */}
            <path
              d="M 76 92 C 86 74, 110 74, 122 78 C 104 82, 90 92, 82 110 Z"
              fill={p.hairHighlight}
              opacity="0.6"
            />
          </g>
        ) : (
          // Sleek executive haircut
          <g>
            <path
              d="M 69 100 C 66 52, 174 52, 171 100 C 166 74, 146 66, 120 66 C 94 66, 74 74, 69 100 Z"
              fill={`url(#${uid}-hair)`}
            />
            {/* Volumetric texture strand */}
            <path
              d="M 84 68 C 100 56, 132 56, 156 64 C 144 60, 122 60, 98 66 Z"
              fill={p.hairHighlight}
              opacity="0.5"
            />
          </g>
        )}
      </motion.svg>
    </div>
  );
}
