'use client';

/**
 * ForPro AI brand logo — exact port of the template's ForProLogo.tsx
 * (forpro-ai-career-User-dashboard). Two variants:
 * - `primary`: 3D network + ascending orange zigzag arrow + ForPro AI wordmark
 * - `contracted`: FP monogram with the orange pill accent
 */
interface ForProLogoProps {
  variant?: 'primary' | 'contracted';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function ForProLogo({
  variant = 'primary',
  theme = 'dark',
  size = 'md',
  showText = true,
  className = '',
}: ForProLogoProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0B1528';
  const networkColor = isDark ? '#E2E8F0' : '#0B1528';
  const networkLineOpacity = isDark ? 0.8 : 0.95;
  const nodeColor = isDark ? '#FFFFFF' : '#0B1528';
  const dashedColor = isDark ? '#94A3B8' : '#64748B';
  const orangeColor = '#FF7A00'; // Official ForPro AI brand orange

  // Contracted FP Monogram with orange rectangle accent
  if (variant === 'contracted') {
    const contractedHeights = {
      sm: 'h-7',
      md: 'h-9',
      lg: 'h-12',
      xl: 'h-16',
    };

    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <svg
          viewBox="0 0 220 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${contractedHeights[size]} w-auto`}
        >
          {/* Top-right orange pill */}
          <rect x="145" y="12" width="65" height="38" rx="10" fill={orangeColor} />

          {/* Bold interlocking F and P letterforms */}
          <path
            d="M 24 30
               H 104
               V 64
               H 58
               V 102
               H 104
               V 64
               H 150
               C 185 64 200 86 200 114
               C 200 142 185 164 150 164
               H 140
               V 220
               H 104
               V 164
               H 58
               V 220
               H 24
               Z
               M 104 98
               H 146
               C 162 98 168 106 168 114
               C 168 122 162 130 146 130
               H 104
               Z"
            fill={textColor}
            fillRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  // Primary Logo: 3D Network with ascending zigzag orange arrow + ForPro AI typography
  const primarySymbolHeights = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const badgeSizes = {
    sm: 'text-[9px] px-1.5 py-0.5 rounded-md',
    md: 'text-xs px-2 py-0.5 rounded-lg',
    lg: 'text-sm px-2.5 py-1 rounded-lg',
    xl: 'text-base px-3 py-1 rounded-xl',
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* 3D Network Graph + Ascending Orange Arrow Symbol */}
      <div className={`relative ${primarySymbolHeights[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Base dashed back edge */}
          <line
            x1="92"
            y1="265"
            x2="310"
            y2="265"
            stroke={dashedColor}
            strokeWidth="5"
            strokeDasharray="10 8"
            strokeLinecap="round"
            strokeOpacity={0.6}
          />

          {/* 3D Pyramid Edges */}
          <g stroke={networkColor} strokeWidth="6.5" strokeLinecap="round" strokeOpacity={networkLineOpacity}>
            <line x1="200" y1="72" x2="92" y2="265" />
            <line x1="200" y1="72" x2="200" y2="310" />
            <line x1="200" y1="72" x2="310" y2="265" />
            <line x1="92" y1="265" x2="200" y2="310" />
            <line x1="200" y1="310" x2="310" y2="265" />
          </g>

          {/* Vertex Node Dots */}
          <circle cx="200" cy="72" r="10.5" fill={nodeColor} />
          <circle cx="92" cy="265" r="9.5" fill={nodeColor} />
          <circle cx="200" cy="310" r="10.5" fill={nodeColor} />
          <circle cx="310" cy="265" r="9.5" fill={nodeColor} />

          {/* Ascending Bold Orange Zigzag Arrow Cutting Through Wireframe */}
          <path
            d="M 46 288 L 175 142 L 235 240 L 320 86"
            stroke={orangeColor}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Arrowhead at top-right */}
          <polygon points="360,45 295,72 322,112" fill={orangeColor} />

          {/* Orange rounded rectangle pill at bottom right */}
          <rect x="235" y="322" width="70" height="38" rx="12" fill={orangeColor} />
        </svg>
      </div>

      {/* Typography: ForPro + AI Badge */}
      {showText && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className={`font-black tracking-tight leading-none ${textSizes[size]}`}
            style={{ color: textColor }}
          >
            ForPro
          </span>
          <span
            className={`font-black text-white leading-none ${badgeSizes[size]}`}
            style={{ backgroundColor: orangeColor }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}