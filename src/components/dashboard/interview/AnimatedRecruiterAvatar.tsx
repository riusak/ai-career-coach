'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { InterviewEmotion, InterviewerId } from '@/types/interview';

interface AnimatedRecruiterAvatarProps {
  speakerId: InterviewerId;
  emotion?: InterviewEmotion;
  isSpeaking: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function AnimatedRecruiterAvatar({
  speakerId,
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
      }, 150);

      // Next blink in 2.8 to 5.2 seconds
      const nextDelay = 2800 + Math.random() * 2400;
      timeoutId = setTimeout(triggerBlink, nextDelay);
    };

    timeoutId = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(timeoutId);
  }, []);

  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-36 h-40',
    lg: 'w-48 h-56',
    xl: 'w-64 h-72',
  }[size];

  const isAlisor = speakerId === 'alisor';

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
      aria-label={`${isAlisor ? 'Mme Alisor' : 'Marc Laurent'} - Avatar`}
    >
      <motion.svg
        viewBox="0 0 240 280"
        className="w-full h-full drop-shadow-md"
        animate={{
          y: isSpeaking ? [0, -3, 1, -2, 0] : [0, -1.5, 0],
          rotate: isSpeaking
            ? emotion === 'curious'
              ? [1, 2.5, 0.5, 2]
              : [0, 0.8, -0.6, 0]
            : emotion === 'thoughtful'
            ? 1.5
            : 0,
        }}
        transition={{
          y: {
            repeat: Infinity,
            duration: isSpeaking ? 1.2 : 3.5,
            ease: 'easeInOut',
          },
          rotate: {
            repeat: isSpeaking ? Infinity : 0,
            duration: isSpeaking ? 1.6 : 0.5,
            ease: 'easeInOut',
          },
        }}
      >
        <defs>
          {/* Subtle skin & hair gradients */}
          <linearGradient id={`skin-${speakerId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isAlisor ? '#FBD9B9' : '#E8B996'} />
            <stop offset="100%" stopColor={isAlisor ? '#E8B896' : '#CF9B73'} />
          </linearGradient>

          <linearGradient id={`hair-${speakerId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isAlisor ? '#422416' : '#1F2430'} />
            <stop offset="100%" stopColor={isAlisor ? '#2A1409' : '#0F131A'} />
          </linearGradient>

          <linearGradient id={`suit-${speakerId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isAlisor ? '#1E293B' : '#0F172A'} />
            <stop offset="100%" stopColor={isAlisor ? '#0F172A' : '#020617'} />
          </linearGradient>

          <linearGradient id={`shirt-${speakerId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isAlisor ? '#0D9488' : '#2563EB'} />
            <stop offset="100%" stopColor={isAlisor ? '#14B8A6' : '#3B82F6'} />
          </linearGradient>

          {/* Shadow filters */}
          <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. Body & Clothes (Shoulders/Chest) */}
        <g>
          {/* Base Shoulders */}
          <path
            d="M 30 280 C 30 215, 75 195, 120 195 C 165 195, 210 215, 210 280 Z"
            fill={`url(#suit-${speakerId})`}
          />

          {/* Inner Shirt Collar */}
          {isAlisor ? (
            // Elegant silk collar for Mme Alisor
            <>
              <path
                d="M 90 195 L 120 230 L 150 195 Z"
                fill={`url(#shirt-${speakerId})`}
              />
              <path
                d="M 85 195 L 120 245 L 98 280 L 80 280 Z"
                fill="#334155"
                opacity="0.8"
              />
              <path
                d="M 155 195 L 120 245 L 142 280 L 160 280 Z"
                fill="#1E293B"
              />
            </>
          ) : (
            // Modern Tech Shirt & Lapel for Marc Laurent
            <>
              <path
                d="M 95 195 L 120 235 L 145 195 Z"
                fill="#FFFFFF"
                opacity="0.95"
              />
              <path
                d="M 116 235 L 124 235 L 124 280 L 116 280 Z"
                fill={`url(#shirt-${speakerId})`}
              />
              <path
                d="M 80 195 L 115 250 L 105 280 L 70 280 Z"
                fill="#1E293B"
              />
              <path
                d="M 160 195 L 125 250 L 135 280 L 170 280 Z"
                fill="#0F172A"
              />
            </>
          )}

          {/* Neck */}
          <path
            d="M 98 150 L 98 198 C 112 205, 128 205, 142 198 L 142 150 Z"
            fill={`url(#skin-${speakerId})`}
          />
          {/* Neck shadow under chin */}
          <path
            d="M 98 152 C 110 162, 130 162, 142 152 L 142 166 C 130 174, 110 174, 98 166 Z"
            fill="#000000"
            opacity="0.12"
          />
        </g>

        {/* 2. Head & Facial Base */}
        <g>
          {/* Ears */}
          <ellipse
            cx="68"
            cy="124"
            rx="9"
            ry="14"
            fill={`url(#skin-${speakerId})`}
          />
          <ellipse
            cx="172"
            cy="124"
            rx="9"
            ry="14"
            fill={`url(#skin-${speakerId})`}
          />
          {/* Mme Alisor Earrings */}
          {isAlisor && (
            <>
              <circle cx="68" cy="138" r="3.5" fill="#F59E0B" />
              <circle cx="172" cy="138" r="3.5" fill="#F59E0B" />
            </>
          )}

          {/* Head Shape */}
          <path
            d={
              isAlisor
                ? 'M 74 110 C 74 65, 166 65, 166 110 C 166 148, 148 168, 120 168 C 92 168, 74 148, 74 110 Z'
                : 'M 74 105 C 74 62, 166 62, 166 105 C 166 146, 150 170, 120 170 C 90 170, 74 146, 74 105 Z'
            }
            fill={`url(#skin-${speakerId})`}
            filter="url(#subtle-shadow)"
          />

          {/* Marc Laurent Stubble / Beard */}
          {!isAlisor && (
            <path
              d="M 82 128 C 82 162, 100 170, 120 170 C 140 170, 158 162, 158 128 C 158 138, 144 148, 120 148 C 96 148, 82 138, 82 128 Z"
              fill="#261A12"
              opacity="0.22"
            />
          )}

          {/* Cheeks Warm Blush */}
          <ellipse
            cx="90"
            cy="134"
            rx="9"
            ry="5"
            fill="#FB7185"
            opacity={emotion === 'smiling' ? 0.35 : 0.18}
          />
          <ellipse
            cx="150"
            cy="134"
            rx="9"
            ry="5"
            fill="#FB7185"
            opacity={emotion === 'smiling' ? 0.35 : 0.18}
          />
        </g>

        {/* 3. Eyebrows (Dynamic Emotion Tilts) */}
        <g>
          {/* Left Eyebrow */}
          <motion.path
            d={
              emotion === 'curious'
                ? 'M 88 95 Q 102 91, 114 96' // raised left brow
                : emotion === 'skeptical'
                ? 'M 88 100 Q 102 101, 114 102' // furrowed left brow
                : 'M 88 98 Q 102 94, 114 98' // natural arc
            }
            stroke={isAlisor ? '#3E2314' : '#1A1E29'}
            strokeWidth={isAlisor ? '2.8' : '3.8'}
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Eyebrow */}
          <motion.path
            d={
              emotion === 'curious'
                ? 'M 126 97 Q 138 95, 152 99' // normal right brow
                : emotion === 'skeptical'
                ? 'M 126 95 Q 138 89, 152 94' // raised right brow
                : 'M 126 98 Q 138 94, 152 98' // natural arc
            }
            stroke={isAlisor ? '#3E2314' : '#1A1E29'}
            strokeWidth={isAlisor ? '2.8' : '3.8'}
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 4. Eyes & Blinking Animation */}
        <g>
          {/* Left Eye */}
          {isBlinking ? (
            // Closed eye line on blink
            <path
              d="M 90 114 Q 102 118, 112 114"
              stroke="#2E1B12"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // Open Eye
            <g>
              <ellipse cx="101" cy="113" rx="8" ry="6.5" fill="#FFFFFF" />
              <ellipse
                cx={emotion === 'thoughtful' ? '99.5' : '101'}
                cy="113"
                rx="4.2"
                ry="4.5"
                fill={isAlisor ? '#633B23' : '#1E293B'}
              />
              <circle cx="99.5" cy="111.5" r="1.4" fill="#FFFFFF" />
              {/* Eyelash for Mme Alisor */}
              {isAlisor && (
                <path
                  d="M 92 110 Q 101 106, 110 110"
                  stroke="#2E1B12"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Right Eye */}
          {isBlinking ? (
            // Closed eye line on blink
            <path
              d="M 128 114 Q 138 118, 150 114"
              stroke="#2E1B12"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            // Open Eye
            <g>
              <ellipse cx="139" cy="113" rx="8" ry="6.5" fill="#FFFFFF" />
              <ellipse
                cx={emotion === 'thoughtful' ? '137.5' : '139'}
                cy="113"
                rx="4.2"
                ry="4.5"
                fill={isAlisor ? '#633B23' : '#1E293B'}
              />
              <circle cx="137.5" cy="111.5" r="1.4" fill="#FFFFFF" />
              {/* Eyelash for Mme Alisor */}
              {isAlisor && (
                <path
                  d="M 130 110 Q 139 106, 148 110"
                  stroke="#2E1B12"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>
          )}

          {/* Glasses for Marc Laurent */}
          {!isAlisor && (
            <g>
              {/* Left rim */}
              <rect
                x="88"
                y="103"
                width="26"
                height="20"
                rx="5"
                fill="none"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Right rim */}
              <rect
                x="126"
                y="103"
                width="26"
                height="20"
                rx="5"
                fill="none"
                stroke="#334155"
                strokeWidth="2"
              />
              {/* Bridge */}
              <path
                d="M 114 111 L 126 111"
                stroke="#334155"
                strokeWidth="2"
                fill="none"
              />
              {/* Glare reflections */}
              <line
                x1="92"
                y1="106"
                x2="100"
                y2="106"
                stroke="#FFFFFF"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.6"
              />
              <line
                x1="130"
                y1="106"
                x2="138"
                y2="106"
                stroke="#FFFFFF"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          )}
        </g>

        {/* 5. Nose */}
        <path
          d={
            isAlisor
              ? 'M 119 118 Q 123 129, 118 132 Q 120 133, 122 133'
              : 'M 118 116 L 122 129 L 117 133 L 123 133'
          }
          stroke="#C28D69"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Dynamic Mouth (Speaking Viseme Animation) */}
        <g>
          {isSpeaking ? (
            // Animated Speaking Mouth Visemes
            <motion.path
              fill="#991B1B"
              stroke="#6B1212"
              strokeWidth="1.5"
              animate={{
                d: [
                  'M 108 146 Q 120 148, 132 146 Q 120 152, 108 146 Z', // slight open
                  'M 106 145 Q 120 144, 134 145 Q 120 158, 106 145 Z', // wide open
                  'M 110 146 Q 120 147, 130 146 Q 120 155, 110 146 Z', // round viseme
                  'M 107 145 Q 120 149, 133 145 Q 120 150, 107 145 Z', // smile talking
                ],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.55,
                ease: 'easeInOut',
              }}
            />
          ) : (
            // Resting Closed Mouth according to emotion
            <path
              d={
                emotion === 'smiling' || emotion === 'impressed'
                  ? 'M 108 146 Q 120 154, 132 146' // warm upward smile
                  : emotion === 'skeptical'
                  ? 'M 108 148 Q 120 148, 132 145' // slight asymmetric pursed lip
                  : emotion === 'thoughtful'
                  ? 'M 110 147 Q 120 146, 130 147' // straight line
                  : 'M 109 146 Q 120 150, 131 146' // soft natural closed
              }
              stroke={isAlisor ? '#9F3A4B' : '#78350F'}
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Upper lip highlight */}
          {!isSpeaking && isAlisor && (
            <path
              d="M 113 144 Q 120 143, 127 144"
              stroke="#D97706"
              strokeWidth="0.8"
              opacity="0.35"
              fill="none"
            />
          )}
        </g>

        {/* 7. Hair (Styled Forehead & Contours) */}
        {isAlisor ? (
          // Mme Alisor: Elegant wavy professional hairstyle
          <g>
            {/* Back Hair Mass */}
            <path
              d="M 64 120 C 58 170, 72 205, 82 220 L 72 170 C 60 130, 68 85, 85 68 Z"
              fill="url(#hair-alisor)"
            />
            <path
              d="M 176 120 C 182 170, 168 205, 158 220 L 168 170 C 180 130, 172 85, 155 68 Z"
              fill="url(#hair-alisor)"
            />
            {/* Forehead Hair Crown & Waves */}
            <path
              d="M 68 108 C 65 52, 175 52, 172 108 C 160 82, 136 78, 118 84 C 98 78, 78 84, 68 108 Z"
              fill="url(#hair-alisor)"
            />
            {/* Side Bangs Accent */}
            <path
              d="M 72 100 C 80 82, 102 82, 114 86 C 98 90, 84 102, 78 120 Z"
              fill="#522C1B"
              opacity="0.75"
            />
          </g>
        ) : (
          // Marc Laurent: Contemporary sculpted executive haircut
          <g>
            <path
              d="M 70 102 C 68 56, 172 56, 170 102 C 166 78, 146 70, 120 70 C 94 70, 74 78, 70 102 Z"
              fill="url(#hair-marc)"
            />
            {/* Textured Hair Highlights */}
            <path
              d="M 85 70 C 100 58, 130 58, 155 66 C 145 62, 125 62, 100 68 Z"
              fill="#374151"
              opacity="0.4"
            />
          </g>
        )}
      </motion.svg>
    </div>
  );
}
