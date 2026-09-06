'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { InterviewEmotion, InterviewerId } from '@/types/interview';

interface AnimatedRecruiterAvatarProps {
  speakerId: InterviewerId;
  avatarSeed?: string;
  emotion?: InterviewEmotion;
  isSpeaking: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  className?: string;
}

// Deterministic hash helper for archetype selection
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function AnimatedRecruiterAvatar({
  speakerId,
  avatarSeed,
  emotion = 'smiling',
  isSpeaking,
  size = 'responsive',
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
      }, 150);

      // Next blink in 2.4 to 4.5 seconds
      const nextDelay = 2400 + Math.random() * 2100;
      timeoutId = setTimeout(triggerBlink, nextDelay);
    };

    timeoutId = setTimeout(triggerBlink, 2200);
    return () => clearTimeout(timeoutId);
  }, []);

  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-36 h-42',
    lg: 'w-48 h-56',
    xl: 'w-64 h-74',
    responsive: 'w-full h-full max-w-[260px] max-h-[300px]',
  }[size];

  // Determine avatar style profile based on seed or speakerId
  const seedKey = avatarSeed || speakerId || 'alisor';
  const seedVal = hashSeed(seedKey);

  const isHardcodedAlisor =
    speakerId.toLowerCase() === 'alisor' || speakerId.toLowerCase().includes('rh');
  const isHardcodedMarc =
    speakerId.toLowerCase() === 'marc' ||
    speakerId.toLowerCase().includes('tech') ||
    speakerId.toLowerCase().includes('directeur');

  let archetype = seedVal % 4;
  if (isHardcodedAlisor) archetype = 0;
  else if (isHardcodedMarc) archetype = 1;

  // Palettes per archetype
  const palettes = [
    // 0: Elegant Executive Woman (Warm Terracotta / Coral / Teal inner)
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
      mouthInterior: '#881337',
      lips: '#BE123C',
      hasGlasses: false,
      hasBeard: false,
      isFemale: true,
      earring: true,
    },
    // 1: Modern Tech Leader Man (Slate / Sapphire / Amber)
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
      mouthInterior: '#7F1D1D',
      lips: '#991B1B',
      hasGlasses: true,
      hasBeard: true,
      isFemale: false,
      earring: false,
    },
    // 2: Dynamic Senior Specialist Woman (Deep Chestnut / Emerald)
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
      mouthInterior: '#701A75',
      lips: '#A21CAF',
      hasGlasses: false,
      hasBeard: false,
      isFemale: true,
      earring: true,
    },
    // 3: VP & Senior Manager Man (Golden Bronze / Midnight Indigo)
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
      mouthInterior: '#7F1D1D',
      lips: '#854D0E',
      hasGlasses: false,
      hasBeard: true,
      isFemale: false,
      earring: false,
    },
  ];

  const p = palettes[archetype];
  const uid = `av-${seedKey.replace(/[^a-z0-9]/gi, '_')}`;

  // Eyebrow geometry based on emotion
  const leftEyebrowD =
    emotion === 'curious'
      ? 'M 86 89 Q 101 82, 114 88' // high raised curious
      : emotion === 'skeptical'
      ? 'M 86 100 Q 101 101, 114 102' // furrowed down skeptical
      : emotion === 'thoughtful'
      ? 'M 86 94 Q 101 96, 114 93'
      : emotion === 'impressed'
      ? 'M 86 90 Q 101 84, 114 89'
      : 'M 86 94 Q 101 89, 114 94'; // smiling relaxed

  const rightEyebrowD =
    emotion === 'curious'
      ? 'M 126 95 Q 139 92, 154 96' // standard level
      : emotion === 'skeptical'
      ? 'M 126 90 Q 139 83, 154 88' // high arched skeptical
      : emotion === 'thoughtful'
      ? 'M 126 93 Q 139 96, 154 94'
      : emotion === 'impressed'
      ? 'M 126 90 Q 139 84, 154 89'
      : 'M 126 94 Q 139 89, 154 94'; // smiling relaxed

  // Pupil / iris offset
  const pupilOffsetX = emotion === 'thoughtful' ? -2.5 : 0;
  const pupilOffsetY = emotion === 'thoughtful' ? -1.5 : 0;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
      aria-label={`Avatar recruteur`}
    >
      <motion.svg
        viewBox="0 0 240 280"
        className="w-full h-full drop-shadow-2xl"
        animate={{
          y: isSpeaking ? [0, -4, 1, -3, 0] : [0, -1.5, 0],
          rotate: isSpeaking
            ? emotion === 'curious'
              ? [0.5, 2.2, 0.5, 1.8]
              : [0, 0.8, -0.6, 0]
            : emotion === 'thoughtful'
            ? 1.5
            : emotion === 'curious'
            ? -1.2
            : 0,
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: isSpeaking ? 1.2 : 3.6,
            ease: 'easeInOut',
          },
          rotate: {
            repeat: isSpeaking ? Infinity : 0,
            duration: isSpeaking ? 1.6 : 0.6,
            ease: 'easeInOut',
          },
        }}
      >
        <defs>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.skinTop} />
            <stop offset="100%" stopColor={p.skinBottom} />
          </linearGradient>

          <linearGradient id={`${uid}-hair`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={p.hairTop} />
            <stop offset="100%" stopColor={p.hairBottom} />
          </linearGradient>

          <linearGradient id={`${uid}-suit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.suitTop} />
            <stop offset="100%" stopColor={p.suitBottom} />
          </linearGradient>

          <radialGradient id={`${uid}-glow`} cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* 1. Body & Attire */}
        <g>
          <path
            d="M 24 280 C 24 212, 70 192, 120 192 C 170 192, 216 212, 216 280 Z"
            fill={`url(#${uid}-suit)`}
          />
          <path
            d="M 24 280 C 24 212, 70 192, 120 192 C 170 192, 216 212, 216 280 Z"
            fill={`url(#${uid}-glow)`}
          />

          {/* Shirt / Top */}
          <path d="M 92 192 L 120 238 L 148 192 Z" fill={p.shirt} opacity="0.96" />

          {/* Lapels */}
          <path d="M 78 192 L 118 256 L 102 280 L 65 280 Z" fill={p.lapel} opacity="0.9" />
          <path d="M 162 192 L 122 256 L 138 280 L 175 280 Z" fill={p.lapel} opacity="0.8" />

          {/* Neck */}
          <path
            d="M 97 146 L 97 196 C 111 204, 129 204, 143 196 L 143 146 Z"
            fill={`url(#${uid}-skin)`}
          />
          <path
            d="M 97 148 C 110 160, 130 160, 143 148 L 143 162 C 130 170, 110 170, 97 162 Z"
            fill={p.skinShadow}
            opacity="0.45"
          />
        </g>

        {/* 2. Head & Facial Structure */}
        <g>
          {/* Ears */}
          <ellipse cx="66" cy="123" rx="8.5" ry="13.5" fill={`url(#${uid}-skin)`} />
          <ellipse cx="66" cy="123" rx="4.5" ry="7.5" fill={p.skinShadow} opacity="0.3" />
          <ellipse cx="174" cy="123" rx="8.5" ry="13.5" fill={`url(#${uid}-skin)`} />
          <ellipse cx="174" cy="123" rx="4.5" ry="7.5" fill={p.skinShadow} opacity="0.3" />

          {/* Earrings */}
          {p.earring && (
            <>
              <circle cx="66" cy="138" r="3.2" fill={p.accent} />
              <circle cx="66" cy="138" r="1.5" fill="#FFF" opacity="0.6" />
              <circle cx="174" cy="138" r="3.2" fill={p.accent} />
              <circle cx="174" cy="138" r="1.5" fill="#FFF" opacity="0.6" />
            </>
          )}

          {/* Head */}
          <path
            d="M 72 106 C 72 58, 168 58, 168 106 C 168 146, 150 168, 120 168 C 90 168, 72 146, 72 106 Z"
            fill={`url(#${uid}-skin)`}
            filter={`url(#${uid}-shadow)`}
          />

          {/* Beard / Stubble */}
          {p.hasBeard && (
            <path
              d="M 80 126 C 80 162, 98 169, 120 169 C 142 169, 160 162, 160 126 C 160 138, 146 148, 120 148 C 94 148, 80 138, 80 126 Z"
              fill={p.hairBottom}
              opacity="0.18"
            />
          )}

          {/* Cheek Warmth / Blush */}
          <ellipse
            cx="88"
            cy="133"
            rx="9.5"
            ry="6"
            fill="#FB7185"
            opacity={emotion === 'smiling' || emotion === 'impressed' ? 0.4 : 0.2}
          />
          <ellipse
            cx="152"
            cy="133"
            rx="9.5"
            ry="6"
            fill="#FB7185"
            opacity={emotion === 'smiling' || emotion === 'impressed' ? 0.4 : 0.2}
          />
        </g>

        {/* 3. Eyebrows with Emotion Animation */}
        <g>
          <motion.path
            d={leftEyebrowD}
            stroke={p.hairTop}
            strokeWidth={p.isFemale ? '3' : '3.8'}
            strokeLinecap="round"
            fill="none"
            animate={{ d: leftEyebrowD }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
          <motion.path
            d={rightEyebrowD}
            stroke={p.hairTop}
            strokeWidth={p.isFemale ? '3' : '3.8'}
            strokeLinecap="round"
            fill="none"
            animate={{ d: rightEyebrowD }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </g>

        {/* 4. Eyes & Blinking */}
        <g>
          {/* Left Eye */}
          {isBlinking ? (
            <path
              d="M 88 113 Q 101 118, 114 113"
              stroke={p.hairBottom}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g>
              <ellipse
                cx="101"
                cy="112"
                rx="8.5"
                ry={emotion === 'skeptical' ? 5.2 : 6.8}
                fill="#FFFFFF"
              />
              <circle
                cx={101 + pupilOffsetX}
                cy={112 + pupilOffsetY}
                r={emotion === 'impressed' ? 4.8 : 4.2}
                fill={p.iris}
              />
              <circle
                cx={101 + pupilOffsetX}
                cy={112 + pupilOffsetY}
                r="2.2"
                fill="#0F172A"
              />
              <circle
                cx={99.5 + pupilOffsetX}
                cy={110.5 + pupilOffsetY}
                r="1.4"
                fill="#FFFFFF"
              />
              <circle
                cx={102.5 + pupilOffsetX}
                cy={113.5 + pupilOffsetY}
                r="0.8"
                fill="#FFFFFF"
                opacity="0.8"
              />
              {p.isFemale && (
                <path
                  d="M 89 108 Q 101 104, 113 108"
                  stroke={p.hairBottom}
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Right Eye */}
          {isBlinking ? (
            <path
              d="M 126 113 Q 139 118, 152 113"
              stroke={p.hairBottom}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g>
              <ellipse
                cx="139"
                cy="112"
                rx="8.5"
                ry={emotion === 'curious' || emotion === 'impressed' ? 7.2 : 6.8}
                fill="#FFFFFF"
              />
              <circle
                cx={139 + pupilOffsetX}
                cy={112 + pupilOffsetY}
                r={emotion === 'impressed' ? 4.8 : 4.2}
                fill={p.iris}
              />
              <circle
                cx={139 + pupilOffsetX}
                cy={112 + pupilOffsetY}
                r="2.2"
                fill="#0F172A"
              />
              <circle
                cx={137.5 + pupilOffsetX}
                cy={110.5 + pupilOffsetY}
                r="1.4"
                fill="#FFFFFF"
              />
              <circle
                cx={140.5 + pupilOffsetX}
                cy={113.5 + pupilOffsetY}
                r="0.8"
                fill="#FFFFFF"
                opacity="0.8"
              />
              {p.isFemale && (
                <path
                  d="M 127 108 Q 139 104, 151 108"
                  stroke={p.hairBottom}
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Glasses */}
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
              <path d="M 115 110 L 125 110" stroke="#334155" strokeWidth="1.8" fill="none" />
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

        {/* 5. Nose Contour */}
        <path
          d="M 119 115 Q 123 127, 118 131 Q 120 132, 122 132"
          stroke={p.skinShadow}
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Dynamic Lip Movement & Realistic Visemes when Speaking */}
        <g id="mouth-group">
          {isSpeaking ? (
            <g>
              {/* Animated Mouth Cavity */}
              <motion.path
                fill={p.mouthInterior}
                stroke={p.lips}
                strokeWidth="1.6"
                animate={{
                  d: [
                    'M 107 145 Q 120 148, 133 145 Q 120 154, 107 145 Z', // Step 1: Open speech shape
                    'M 105 143 Q 120 140, 135 143 Q 137 160, 120 162 Q 103 160, 105 143 Z', // Step 2: Wide 'A' Viseme
                    'M 110 144 Q 120 141, 130 144 Q 132 157, 120 158 Q 108 157, 110 144 Z', // Step 3: Rounded 'O' Viseme
                    'M 106 144 Q 120 143, 134 144 Q 136 153, 120 155 Q 104 153, 106 144 Z', // Step 4: Wide 'E' Viseme
                    'M 107 145 Q 120 147, 133 145 Q 120 149, 107 145 Z', // Step 5: Near-closed Viseme
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.46,
                  ease: 'easeInOut',
                }}
              />

              {/* Upper Teeth in Mouth Cavity */}
              <motion.path
                fill="#FFFFFF"
                opacity="0.9"
                animate={{
                  d: [
                    'M 110 146 Q 120 145, 130 146 L 129 148 Q 120 147, 111 148 Z',
                    'M 108 144 Q 120 142, 132 144 L 131 148 Q 120 146, 109 148 Z',
                    'M 112 145 Q 120 143, 128 145 L 127 148 Q 120 147, 113 148 Z',
                    'M 109 145 Q 120 144, 131 145 L 130 148 Q 120 147, 110 148 Z',
                    'M 110 146 Q 120 145, 130 146 L 129 147 Q 120 146, 111 147 Z',
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.46,
                  ease: 'easeInOut',
                }}
              />

              {/* Tongue in Mouth Cavity */}
              <motion.path
                fill="#F43F5E"
                opacity="0.8"
                animate={{
                  d: [
                    'M 114 152 Q 120 150, 126 152 Q 120 154, 114 152 Z',
                    'M 112 159 Q 120 154, 128 159 Q 120 162, 112 159 Z',
                    'M 114 156 Q 120 153, 126 156 Q 120 158, 114 156 Z',
                    'M 113 153 Q 120 151, 127 153 Q 120 155, 113 153 Z',
                    'M 114 148 Q 120 147, 126 148 Q 120 149, 114 148 Z',
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.46,
                  ease: 'easeInOut',
                }}
              />

              {/* Upper Lip Line Accent */}
              <motion.path
                d="M 106 144 Q 120 141, 134 144"
                stroke={p.lips}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            // Idle Emotion Expression
            <g>
              <path
                d={
                  emotion === 'smiling' || emotion === 'impressed'
                    ? 'M 105 144 Q 120 156, 135 144' // broad warm friendly smile
                    : emotion === 'skeptical'
                    ? 'M 107 148 Q 120 146, 133 142' // asymmetrical skeptical smirk
                    : emotion === 'thoughtful'
                    ? 'M 109 146 Q 120 144, 131 146' // pursed thoughtful line
                    : emotion === 'curious'
                    ? 'M 107 145 Q 120 151, 133 145' // slight inquisitive parted smile
                    : 'M 107 145 Q 120 150, 133 145'
                }
                stroke={p.lips}
                strokeWidth={p.isFemale ? '2.8' : '2.4'}
                strokeLinecap="round"
                fill="none"
              />
              {/* Smile corner accents */}
              {(emotion === 'smiling' || emotion === 'impressed') && (
                <>
                  <line x1="104" y1="143" x2="106" y2="146" stroke={p.lips} strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="136" y1="143" x2="134" y2="146" stroke={p.lips} strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </g>
          )}
        </g>

        {/* 7. Hair Styling */}
        {p.isFemale ? (
          <g>
            <path
              d="M 64 122 C 58 172, 70 205, 80 220 L 70 170 C 58 130, 66 82, 84 66 Z"
              fill={`url(#${uid}-hair)`}
            />
            <path
              d="M 176 122 C 182 172, 170 205, 160 220 L 170 170 C 182 130, 174 82, 156 66 Z"
              fill={`url(#${uid}-hair)`}
            />
            <path
              d="M 68 106 C 64 48, 176 48, 172 106 C 160 80, 134 76, 118 82 C 98 76, 78 82, 68 106 Z"
              fill={`url(#${uid}-hair)`}
            />
            <path
              d="M 76 92 C 86 74, 110 74, 122 78 C 104 82, 90 92, 82 110 Z"
              fill={p.hairHighlight}
              opacity="0.6"
            />
          </g>
        ) : (
          <g>
            <path
              d="M 69 100 C 66 52, 174 52, 171 100 C 166 74, 146 66, 120 66 C 94 66, 74 74, 69 100 Z"
              fill={`url(#${uid}-hair)`}
            />
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
