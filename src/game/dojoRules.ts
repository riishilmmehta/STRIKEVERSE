import type { DojoBlock, DojoBlockType } from './types';

export interface DojoBlockCatalogItem {
  type: DojoBlockType;
  label: string;
  role: string;
  cost: number;
  radius: number;
  color: string;
}

export const DOJO_CATALOG: Record<DojoBlockType, DojoBlockCatalogItem> = {
  dummy: {
    type: 'dummy',
    label: 'Training Dummy',
    role: 'Combo & parry target',
    cost: 0,
    radius: 0.7,
    color: '#d97706',
  },
  trampoline: {
    type: 'trampoline',
    label: 'Bounce Pad',
    role: 'High-jump air launcher',
    cost: 0,
    radius: 1.25,
    color: '#06b6d4',
  },
  dashpad: {
    type: 'dashpad',
    label: 'Dash Pad',
    role: 'Forward speed booster',
    cost: 0,
    radius: 1.2,
    color: '#10b981',
  },
  crate: {
    type: 'crate',
    label: 'Smash Crate',
    role: 'Knockback hazard prop',
    cost: 0,
    radius: 0.85,
    color: '#b45309',
  },
  lantern: {
    type: 'lantern',
    label: 'Dojo Lantern',
    role: 'Warm courtyard light',
    cost: 0,
    radius: 0.55,
    color: '#f59e0b',
  },
  trophy: {
    type: 'trophy',
    label: 'Trophy Pedestal',
    role: 'Champion showcase',
    cost: 0,
    radius: 0.75,
    color: '#eab308',
  },
};

export const DOJO_PLOT_HALF_SIZE = 15;
export const DOJO_GRID_STEP = 2;
export const MAX_DOJO_BLOCKS = 32;

export const DEFAULT_DOJO_BLOCKS: DojoBlock[] = [
  { id: 'starter-dummy-1', type: 'dummy', x: 0, z: -6, rotation: 0 },
  { id: 'starter-dummy-2', type: 'dummy', x: 4, z: -6, rotation: -0.3 },
  { id: 'starter-tramp-1', type: 'trampoline', x: -6, z: -2, rotation: 0 },
  { id: 'starter-dash-1', type: 'dashpad', x: -6, z: 4, rotation: 0 },
  { id: 'starter-crate-1', type: 'crate', x: 6, z: -2, rotation: 0 },
  { id: 'starter-lantern-1', type: 'lantern', x: -10, z: -10, rotation: 0 },
  { id: 'starter-lantern-2', type: 'lantern', x: 10, z: -10, rotation: 0 },
  { id: 'starter-trophy-1', type: 'trophy', x: 0, z: -12, rotation: 0 },
];

export function snapToDojoGrid(val: number): number {
  const snapped = Math.round(val / DOJO_GRID_STEP) * DOJO_GRID_STEP;
  return Math.max(
    -DOJO_PLOT_HALF_SIZE + 2,
    Math.min(DOJO_PLOT_HALF_SIZE - 2, snapped)
  );
}

export function canPlaceDojoBlock(
  existing: DojoBlock[],
  x: number,
  z: number
): { ok: boolean; reason?: string } {
  if (existing.length >= MAX_DOJO_BLOCKS) {
    return { ok: false, reason: 'Dojo plot limit reached (32 blocks).' };
  }
  const gx = snapToDojoGrid(x);
  const gz = snapToDojoGrid(z);
  // Keep player spawn point (0, 8) clear
  if (Math.hypot(gx - 0, gz - 8) < 2.2) {
    return { ok: false, reason: 'Keep the Dojo entrance clear.' };
  }
  const occupied = existing.some((b) => Math.hypot(b.x - gx, b.z - gz) < 1.5);
  if (occupied) {
    return { ok: false, reason: 'That tile already holds a Dojo item.' };
  }
  return { ok: true };
}

export function placeDojoBlock(
  existing: DojoBlock[],
  type: DojoBlockType,
  x: number,
  z: number,
  rotation = 0
): { blocks: DojoBlock[]; placed: DojoBlock | null; reason?: string } {
  const check = canPlaceDojoBlock(existing, x, z);
  if (!check.ok) {
    return { blocks: existing, placed: null, reason: check.reason };
  }
  const placed: DojoBlock = {
    id: `dojo-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    x: snapToDojoGrid(x),
    z: snapToDojoGrid(z),
    rotation,
  };
  return { blocks: [...existing, placed], placed };
}

export function removeNearestDojoBlock(
  existing: DojoBlock[],
  x: number,
  z: number,
  maxRadius = 2.6
): { blocks: DojoBlock[]; removed: DojoBlock | null } {
  let bestIdx = -1;
  let bestDist = maxRadius;
  for (let i = 0; i < existing.length; i++) {
    const d = Math.hypot(existing[i].x - x, existing[i].z - z);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) {
    return { blocks: existing, removed: null };
  }
  const removed = existing[bestIdx];
  return {
    blocks: existing.filter((_, idx) => idx !== bestIdx),
    removed,
  };
}
