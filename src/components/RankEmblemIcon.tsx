import { getRankEmblemSpec } from '../game/rankEmblems';
import type { RankEmblemSpec } from '../game/rankEmblems';

interface RankEmblemIconProps {
  rank: number;
  size?: number;
  className?: string;
}

function renderFrame(spec: RankEmblemSpec) {
  switch (spec.frameShape) {
    case 'diamond':
      return (
        <>
          <polygon
            points="32,4 58,32 32,60 6,32"
            fill={spec.bgHex}
            stroke={spec.primaryHex}
            strokeWidth="3.5"
          />
          <polygon
            points="32,10 51,32 32,54 13,32"
            fill="none"
            stroke={spec.secondaryHex}
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        </>
      );
    case 'hex':
      return (
        <>
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill={spec.bgHex}
            stroke={spec.primaryHex}
            strokeWidth="3.5"
          />
          <polygon
            points="32,10 50,21 50,43 32,54 14,43 14,21"
            fill="none"
            stroke={spec.secondaryHex}
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
        </>
      );
    case 'shield':
      return (
        <>
          <polygon
            points="32,4 56,14 52,40 32,60 12,40 8,14"
            fill={spec.bgHex}
            stroke={spec.primaryHex}
            strokeWidth="3.5"
          />
          <polygon
            points="32,10 50,18 47,38 32,53 17,38 14,18"
            fill="none"
            stroke={spec.secondaryHex}
            strokeOpacity="0.6"
            strokeWidth="1.5"
          />
        </>
      );
    case 'octagram':
      return (
        <>
          <polygon
            points="32,3 42,14 57,15 53,30 59,44 44,49 32,61 20,49 5,44 11,30 7,15 22,14"
            fill={spec.bgHex}
            stroke={spec.primaryHex}
            strokeWidth="3.2"
          />
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke={spec.secondaryHex}
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        </>
      );
    case 'celestial_halo':
      return (
        <>
          <circle
            cx="32"
            cy="32"
            r="27"
            fill={spec.bgHex}
            stroke={spec.primaryHex}
            strokeWidth="3.5"
          />
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke={spec.secondaryHex}
            strokeWidth="1.6"
            strokeDasharray="6 3"
          />
          <polygon
            points="32,2 35,9 29,9"
            fill={spec.primaryHex}
          />
          <polygon
            points="32,62 35,55 29,55"
            fill={spec.primaryHex}
          />
        </>
      );
  }
}

function renderGlyph(spec: RankEmblemSpec) {
  switch (spec.glyph) {
    case 'compass_star':
      return (
        <g>
          <polygon
            points="32,14 36,28 50,32 36,36 32,50 28,36 14,32 28,28"
            fill={spec.primaryHex}
          />
          <circle cx="32" cy="32" r="4" fill={spec.secondaryHex} />
        </g>
      );
    case 'trail_chevron':
      return (
        <g fill="none" stroke={spec.primaryHex} strokeWidth="4" strokeLinecap="square">
          <polyline points="20,28 32,16 44,28" />
          <polyline points="20,40 32,28 44,40" stroke={spec.secondaryHex} />
          <circle cx="32" cy="46" r="3" fill={spec.primaryHex} stroke="none" />
        </g>
      );
    case 'fang_leaf':
      return (
        <g>
          <polygon points="32,15 44,31 32,49 20,31" fill={spec.primaryHex} />
          <line x1="32" y1="18" x2="32" y2="46" stroke={spec.bgHex} strokeWidth="2.5" />
          <circle cx="32" cy="31" r="4" fill={spec.secondaryHex} />
        </g>
      );
    case 'wild_antler':
      return (
        <g fill="none" stroke={spec.primaryHex} strokeWidth="3.2" strokeLinecap="round">
          <path d="M32 46 L32 28 M32 32 L21 20 M25 24 L20 26 M32 32 L43 20 M39 24 L44 26" />
          <polygon points="32,15 36,23 32,27 28,23" fill={spec.secondaryHex} stroke="none" />
        </g>
      );
    case 'crossed_spears':
      return (
        <g>
          <line x1="20" y1="44" x2="44" y2="20" stroke={spec.primaryHex} strokeWidth="3.6" />
          <line x1="44" y1="44" x2="20" y2="20" stroke={spec.primaryHex} strokeWidth="3.6" />
          <polygon points="46,18 39,18 46,25" fill={spec.secondaryHex} />
          <polygon points="18,18 25,18 18,25" fill={spec.secondaryHex} />
          <polygon points="32,25 38,32 32,39 26,32" fill={spec.secondaryHex} />
        </g>
      );
    case 'iron_bastion':
      return (
        <g>
          <polygon points="19,20 25,20 25,26 29,26 29,20 35,20 35,26 39,26 39,20 45,20 43,45 21,45" fill={spec.primaryHex} />
          <rect x="28" y="33" width="8" height="12" fill={spec.bgHex} />
          <polygon points="32,13 36,19 28,19" fill={spec.secondaryHex} />
        </g>
      );
    case 'mythic_crown':
      return (
        <g>
          <polygon
            points="17,42 15,24 25,31 32,16 39,31 49,24 47,42"
            fill={spec.primaryHex}
            stroke={spec.secondaryHex}
            strokeWidth="1.6"
          />
          <rect x="18" y="44" width="28" height="4" fill={spec.secondaryHex} />
        </g>
      );
    case 'radiant_halo':
      return (
        <g>
          <circle cx="32" cy="32" r="13" fill="none" stroke={spec.primaryHex} strokeWidth="3.5" />
          <polygon
            points="32,12 36,26 50,32 36,38 32,52 28,38 14,32 28,26"
            fill={spec.secondaryHex}
          />
          <circle cx="32" cy="32" r="5" fill={spec.primaryHex} />
        </g>
      );
    case 'cosmic_orbit':
      return (
        <g>
          <ellipse
            cx="32"
            cy="32"
            rx="16"
            ry="7"
            transform="rotate(-28 32 32)"
            fill="none"
            stroke={spec.secondaryHex}
            strokeWidth="2.4"
          />
          <ellipse
            cx="32"
            cy="32"
            rx="16"
            ry="7"
            transform="rotate(28 32 32)"
            fill="none"
            stroke={spec.primaryHex}
            strokeWidth="2.4"
          />
          <circle cx="32" cy="32" r="6" fill={spec.primaryHex} />
        </g>
      );
    case 'supernova':
      return (
        <g>
          <polygon
            points="32,11 36,25 49,17 39,29 53,32 39,35 49,47 36,39 32,53 28,39 15,47 25,35 11,32 25,29 15,17 28,25"
            fill={spec.primaryHex}
          />
          <circle cx="32" cy="32" r="6" fill={spec.secondaryHex} />
        </g>
      );
    case 'eclipse_ring':
      return (
        <g>
          <circle cx="32" cy="32" r="14" fill="none" stroke={spec.secondaryHex} strokeWidth="4" />
          <circle cx="32" cy="32" r="11" fill={spec.primaryHex} />
          <circle cx="36" cy="29" r="9.5" fill={spec.bgHex} />
        </g>
      );
    case 'singularity_vortex':
      return (
        <g>
          <circle cx="32" cy="32" r="16" fill="none" stroke={spec.primaryHex} strokeWidth="2.5" strokeDasharray="8 4" />
          <circle cx="32" cy="32" r="10" fill="none" stroke={spec.secondaryHex} strokeWidth="2.8" />
          <circle cx="32" cy="32" r="5" fill="#020617" stroke={spec.secondaryHex} strokeWidth="2" />
        </g>
      );
    case 'titan_pillar':
      return (
        <g>
          <rect x="20" y="16" width="24" height="5" fill={spec.secondaryHex} />
          <rect x="23" y="21" width="6" height="22" fill={spec.primaryHex} />
          <rect x="35" y="21" width="6" height="22" fill={spec.primaryHex} />
          <rect x="19" y="43" width="26" height="5" fill={spec.secondaryHex} />
          <polygon points="32,23 36,32 32,41 28,32" fill={spec.secondaryHex} />
        </g>
      );
    case 'apex_spire':
      // Bespoke Rank #49 APEX crest: razor twin-wing crimson-gold apex crown!
      return (
        <g>
          <polygon
            points="32,10 38,26 51,18 45,42 32,48 19,42 13,18 26,26"
            fill={spec.primaryHex}
            stroke={spec.secondaryHex}
            strokeWidth="2"
          />
          <polygon points="32,19 36,32 32,41 28,32" fill={spec.secondaryHex} />
        </g>
      );
    case 'omni_infinity':
      // Bespoke Rank #50 OMNI crest: radiant 8-ray sunburst + cosmic infinity eye!
      return (
        <g>
          <polygon
            points="32,9 36,22 48,16 42,28 55,32 42,36 48,48 36,42 32,55 28,42 16,48 22,36 9,32 22,28 16,16 28,22"
            fill={spec.primaryHex}
          />
          <path
            d="M21 32 C21 26, 28 26, 32 32 C36 38, 43 38, 43 32 C43 26, 36 26, 32 32 C28 38, 21 38, 21 32 Z"
            fill="none"
            stroke={spec.bgHex}
            strokeWidth="3.5"
          />
          <path
            d="M21 32 C21 26, 28 26, 32 32 C36 38, 43 38, 43 32 C43 26, 36 26, 32 32 C28 38, 21 38, 21 32 Z"
            fill="none"
            stroke={spec.secondaryHex}
            strokeWidth="2"
          />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </g>
      );
  }
}

export function RankEmblemIcon({ rank, size = 28, className = '' }: RankEmblemIconProps) {
  const spec = getRankEmblemSpec(rank);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`Rank ${spec.rank} ${spec.rankName} (${spec.tierName}) Emblem`}
      className={`shrink-0 ${className}`}
      style={{
        filter:
          spec.tier >= 4 || spec.isLandmarkRank
            ? `drop-shadow(0 0 6px ${spec.glowHex}88)`
            : undefined,
      }}
    >
      {renderFrame(spec)}
      {renderGlyph(spec)}
    </svg>
  );
}
