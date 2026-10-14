import React from 'react';

interface WealthCreationLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const WealthCreationLogo: React.FC<WealthCreationLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm select-none"
        aria-label="Wealth Creation Matrix Emblem"
      >
        <defs>
          {/* Rich Metallic Gold Gradient - Left to Right */}
          <linearGradient id="goldMetallic" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#DFB251" />
            <stop offset="25%" stopColor="#FFF2B2" />
            <stop offset="50%" stopColor="#C99427" />
            <stop offset="75%" stopColor="#F9E28C" />
            <stop offset="100%" stopColor="#8A5B0B" />
          </linearGradient>

          {/* Deep Gold Bevel Gradient */}
          <linearGradient id="goldBevel" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#754C05" />
            <stop offset="35%" stopColor="#B38018" />
            <stop offset="70%" stopColor="#FCE788" />
            <stop offset="100%" stopColor="#96670E" />
          </linearGradient>

          {/* Polished Chrome / Silver Gradient */}
          <linearGradient id="silverMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="30%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#94A3B8" />
            <stop offset="85%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          {/* Inner Silver Shadow */}
          <linearGradient id="silverShadow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="60%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* 3D Golden Sphere Pearl Radial Gradient */}
          <radialGradient id="sphereGold" cx="36%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#FFFEEA" />
            <stop offset="20%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#D97706" />
            <stop offset="85%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </radialGradient>

          {/* Realistic Ambient Occlusion Shadow */}
          <filter id="subtleShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#subtleShadow)">
          {/* SILVER INNER INTERLACED CHEVRON STRUCTURE */}
          {/* Upper Silver Wings */}
          <path
            d="M 70 24 L 100 58 L 130 24 L 144 38 L 100 86 L 56 38 Z"
            fill="url(#silverMetallic)"
            stroke="#CBD5E1"
            strokeWidth="0.8"
          />
          <path
            d="M 70 24 L 100 58 L 100 68 L 64 29 Z"
            fill="url(#silverShadow)"
            opacity="0.8"
          />

          {/* Inner Lower Silver Chevron Nesting the Sphere */}
          <path
            d="M 52 74 L 100 126 L 148 74 L 158 84 L 100 146 L 42 84 Z"
            fill="url(#silverMetallic)"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />

          {/* OUTER GOLD 'M' GEOMETRIC CROWN FRAME */}
          {/* Left Vertical Pillar */}
          <path
            d="M 22 24 L 48 24 L 48 152 L 22 152 Z"
            fill="url(#goldMetallic)"
            stroke="#754C05"
            strokeWidth="0.8"
          />
          <path
            d="M 22 24 L 27 24 L 27 152 L 22 152 Z"
            fill="url(#goldBevel)"
            opacity="0.7"
          />

          {/* Right Vertical Pillar */}
          <path
            d="M 152 24 L 178 24 L 178 152 L 152 152 Z"
            fill="url(#goldMetallic)"
            stroke="#754C05"
            strokeWidth="0.8"
          />
          <path
            d="M 173 24 L 178 24 L 178 152 L 173 152 Z"
            fill="url(#goldBevel)"
            opacity="0.7"
          />

          {/* Left Slanted Gold Arm */}
          <path
            d="M 48 24 L 100 96 L 86 112 L 48 60 Z"
            fill="url(#goldMetallic)"
            stroke="#8A5B0B"
            strokeWidth="0.8"
          />
          <path
            d="M 48 24 L 56 24 L 92 104 L 86 112 Z"
            fill="url(#goldBevel)"
            opacity="0.6"
          />

          {/* Right Slanted Gold Arm */}
          <path
            d="M 152 24 L 100 96 L 114 112 L 152 60 Z"
            fill="url(#goldMetallic)"
            stroke="#8A5B0B"
            strokeWidth="0.8"
          />
          <path
            d="M 144 24 L 152 24 L 114 112 L 108 104 Z"
            fill="url(#goldBevel)"
            opacity="0.6"
          />

          {/* Lower Gold Triangular Apex */}
          <path
            d="M 82 118 L 100 138 L 118 118 L 126 128 L 100 156 L 74 128 Z"
            fill="url(#goldMetallic)"
            stroke="#754C05"
            strokeWidth="0.8"
          />

          {/* Outer Gold Base Bracket Supports */}
          <path
            d="M 22 144 L 58 144 L 58 154 L 22 154 Z"
            fill="url(#goldBevel)"
          />
          <path
            d="M 142 144 L 178 144 L 178 154 L 142 154 Z"
            fill="url(#goldBevel)"
          />

          {/* 3D CENTRAL METALLIC GOLD SPHERICAL PEARL */}
          {/* Sphere Drop Shadow */}
          <ellipse
            cx="100"
            cy="98"
            rx="21"
            ry="7"
            fill="#1E1202"
            opacity="0.45"
          />
          {/* Sphere Body with Radial Specular Gradient */}
          <circle
            cx="100"
            cy="84"
            r="19"
            fill="url(#sphereGold)"
            stroke="#8A5B0B"
            strokeWidth="0.8"
          />
          {/* Primary High-Gloss Specular Highlight Dot */}
          <circle
            cx="94"
            cy="77"
            r="4"
            fill="#FFFFFF"
            opacity="0.85"
          />
          {/* Secondary Soft Rim Reflection */}
          <ellipse
            cx="106"
            cy="93"
            rx="8"
            ry="3.5"
            fill="#FDE68A"
            opacity="0.35"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col select-none">
          <span className="font-serif text-xs sm:text-sm font-bold tracking-widest uppercase text-amber-100 leading-tight">
            Wealth Creation
          </span>
          <span className="font-serif text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-amber-200/90 leading-tight">
            Matrix
          </span>
        </div>
      )}
    </div>
  );
};
