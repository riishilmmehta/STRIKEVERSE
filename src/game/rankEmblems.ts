import { getArenaRankSpec } from './arenaRanks';
import type { ArenaRankSpec } from './arenaRanks';

export type RankEmblemFrameShape =
  | 'diamond'
  | 'hex'
  | 'shield'
  | 'octagram'
  | 'celestial_halo';

export type RankEmblemGlyphId =
  | 'compass_star'
  | 'trail_chevron'
  | 'fang_leaf'
  | 'wild_antler'
  | 'crossed_spears'
  | 'iron_bastion'
  | 'mythic_crown'
  | 'radiant_halo'
  | 'cosmic_orbit'
  | 'supernova'
  | 'eclipse_ring'
  | 'singularity_vortex'
  | 'titan_pillar'
  | 'apex_spire'
  | 'omni_infinity';

export interface RankEmblemSpec {
  rank: number;
  rankName: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  frameShape: RankEmblemFrameShape;
  glyph: RankEmblemGlyphId;
  isLandmarkRank: boolean;
  primaryHex: string;
  secondaryHex: string;
  bgHex: string;
  glowHex: string;
  badgeTag: string;
}

const TIER_EMBLEM_BASE: Record<
  1 | 2 | 3 | 4 | 5,
  {
    frameShape: RankEmblemFrameShape;
    glyph: RankEmblemGlyphId;
    primaryHex: string;
    secondaryHex: string;
    bgHex: string;
    glowHex: string;
    badgeTag: string;
  }
> = {
  1: {
    frameShape: 'diamond',
    glyph: 'compass_star',
    primaryHex: '#e2e8f0',
    secondaryHex: '#38bdf8',
    bgHex: '#0f172a',
    glowHex: '#38bdf8',
    badgeTag: 'UNCHARTED',
  },
  2: {
    frameShape: 'hex',
    glyph: 'fang_leaf',
    primaryHex: '#2dd4bf',
    secondaryHex: '#34d399',
    bgHex: '#042f2e',
    glowHex: '#14b8a6',
    badgeTag: 'WILDS',
  },
  3: {
    frameShape: 'shield',
    glyph: 'crossed_spears',
    primaryHex: '#fb923c',
    secondaryHex: '#f43f5e',
    bgHex: '#2a120a',
    glowHex: '#f97316',
    badgeTag: 'FRONTIER',
  },
  4: {
    frameShape: 'octagram',
    glyph: 'mythic_crown',
    primaryHex: '#facc15',
    secondaryHex: '#c084fc',
    bgHex: '#1e1035',
    glowHex: '#eab308',
    badgeTag: 'MYTHIC',
  },
  5: {
    frameShape: 'celestial_halo',
    glyph: 'cosmic_orbit',
    primaryHex: '#34d399',
    secondaryHex: '#38bdf8',
    bgHex: '#061a24',
    glowHex: '#22d3ee',
    badgeTag: 'COSMIC',
  },
};

const LANDMARK_RANK_OVERRIDES: Record<
  number,
  Partial<Pick<RankEmblemSpec, 'glyph' | 'primaryHex' | 'secondaryHex' | 'glowHex' | 'badgeTag'>>
> = {
  10: {
    glyph: 'trail_chevron',
    primaryHex: '#7dd3fc',
    secondaryHex: '#e2e8f0',
    badgeTag: 'PATHBREAKER',
  },
  20: {
    glyph: 'wild_antler',
    primaryHex: '#34d399',
    secondaryHex: '#a7f3d0',
    badgeTag: 'SURVIVALIST',
  },
  30: {
    glyph: 'iron_bastion',
    primaryHex: '#f97316',
    secondaryHex: '#fde047',
    badgeTag: 'OVERLORD',
  },
  40: {
    glyph: 'radiant_halo',
    primaryHex: '#fde047',
    secondaryHex: '#f472b6',
    badgeTag: 'PARAGON',
  },
  44: {
    glyph: 'supernova',
    primaryHex: '#fde047',
    secondaryHex: '#fb923c',
    glowHex: '#facc15',
    badgeTag: 'NOVA',
  },
  45: {
    glyph: 'eclipse_ring',
    primaryHex: '#c084fc',
    secondaryHex: '#fb923c',
    glowHex: '#a855f7',
    badgeTag: 'ECLIPSE',
  },
  46: {
    glyph: 'singularity_vortex',
    primaryHex: '#818cf8',
    secondaryHex: '#22d3ee',
    glowHex: '#6366f1',
    badgeTag: 'SINGULARITY',
  },
  48: {
    glyph: 'titan_pillar',
    primaryHex: '#38bdf8',
    secondaryHex: '#facc15',
    glowHex: '#38bdf8',
    badgeTag: 'TITAN',
  },
  49: {
    glyph: 'apex_spire',
    primaryHex: '#fb7185',
    secondaryHex: '#facc15',
    glowHex: '#f43f5e',
    badgeTag: 'APEX',
  },
  50: {
    glyph: 'omni_infinity',
    primaryHex: '#fef08a',
    secondaryHex: '#38bdf8',
    glowHex: '#facc15',
    badgeTag: 'OMNI',
  },
};

export const LANDMARK_RANK_NUMBERS = Object.keys(LANDMARK_RANK_OVERRIDES).map(Number);

export function getRankEmblemSpec(rankOrSpec: number | ArenaRankSpec): RankEmblemSpec {
  const rankSpec =
    typeof rankOrSpec === 'number' ? getArenaRankSpec(rankOrSpec) : rankOrSpec;
  const base = TIER_EMBLEM_BASE[rankSpec.tier];
  const override = LANDMARK_RANK_OVERRIDES[rankSpec.rank];

  return {
    rank: rankSpec.rank,
    rankName: rankSpec.name,
    tier: rankSpec.tier,
    tierName: rankSpec.tierName,
    frameShape: base.frameShape,
    glyph: override?.glyph ?? base.glyph,
    isLandmarkRank: Boolean(override),
    primaryHex: override?.primaryHex ?? base.primaryHex,
    secondaryHex: override?.secondaryHex ?? base.secondaryHex,
    bgHex: base.bgHex,
    glowHex: override?.glowHex ?? base.glowHex,
    badgeTag: override?.badgeTag ?? base.badgeTag,
  };
}

/**
 * Draws the exact same Rank Tier / Apex / Omni emblem on an HTML5 2D Canvas context
 * so Nexus City 3D overhead plates match the 1v1 Arena SVG emblem system.
 */
export function drawRankEmblemOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  spec: RankEmblemSpec
): void {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer Frame Shape
  ctx.beginPath();
  if (spec.frameShape === 'diamond') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.92, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.92, 0);
    ctx.closePath();
  } else if (spec.frameShape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (spec.frameShape === 'shield') {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.88, -r * 0.56);
    ctx.lineTo(r * 0.72, r * 0.42);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.72, r * 0.42);
    ctx.lineTo(-r * 0.88, -r * 0.56);
    ctx.closePath();
  } else if (spec.frameShape === 'octagram') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.76;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    // celestial_halo
    ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
  }

  ctx.fillStyle = spec.bgHex;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.14);
  ctx.strokeStyle = spec.primaryHex;
  ctx.stroke();

  // Inner Glyph
  ctx.fillStyle = spec.primaryHex;
  ctx.strokeStyle = spec.secondaryHex;
  ctx.lineWidth = Math.max(1.8, r * 0.11);

  if (spec.glyph === 'omni_infinity') {
    // 8-ray radiant star + glowing infinity eye
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rad = i % 2 === 0 ? r * 0.74 : r * 0.34;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = spec.primaryHex;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = spec.secondaryHex;
    ctx.fill();
  } else if (spec.glyph === 'apex_spire') {
    // Razor twin-wing crown + apex spike
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(r * 0.28, -r * 0.12);
    ctx.lineTo(r * 0.68, -r * 0.38);
    ctx.lineTo(r * 0.44, r * 0.48);
    ctx.lineTo(-r * 0.44, r * 0.48);
    ctx.lineTo(-r * 0.68, -r * 0.38);
    ctx.lineTo(-r * 0.28, -r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (spec.glyph === 'eclipse_ring') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
    ctx.strokeStyle = spec.secondaryHex;
    ctx.lineWidth = Math.max(2.2, r * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.12, -r * 0.06, r * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = spec.bgHex;
    ctx.fill();
  } else if (spec.glyph === 'mythic_crown' || spec.glyph === 'radiant_halo') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, r * 0.36);
    ctx.lineTo(-r * 0.56, -r * 0.26);
    ctx.lineTo(-r * 0.2, 0);
    ctx.lineTo(0, -r * 0.56);
    ctx.lineTo(r * 0.2, 0);
    ctx.lineTo(r * 0.56, -r * 0.26);
    ctx.lineTo(r * 0.52, r * 0.36);
    ctx.closePath();
    ctx.fill();
  } else if (spec.glyph === 'crossed_spears' || spec.glyph === 'iron_bastion') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.46);
    ctx.lineTo(r * 0.46, r * 0.46);
    ctx.moveTo(r * 0.46, -r * 0.46);
    ctx.lineTo(-r * 0.46, r * 0.46);
    ctx.strokeStyle = spec.primaryHex;
    ctx.lineWidth = Math.max(2.5, r * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = spec.secondaryHex;
    ctx.fill();
  } else if (spec.glyph === 'fang_leaf' || spec.glyph === 'wild_antler') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.58);
    ctx.lineTo(r * 0.44, r * 0.12);
    ctx.lineTo(0, r * 0.56);
    ctx.lineTo(-r * 0.44, r * 0.12);
    ctx.closePath();
    ctx.fill();
  } else {
    // 4-point compass star / cosmic orbit default
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r * 0.62 : r * 0.22;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
