export const COMBO_MILESTONES = [20, 50, 100] as const;

export type ComboMilestoneThreshold = (typeof COMBO_MILESTONES)[number];

export interface ComboMilestoneSpec {
  threshold: ComboMilestoneThreshold;
  title: string;
  subtitle: string;
  sparkCount: number;
  shockwaveRings: number;
  primaryHex: string;
  secondaryHex: string;
  flashOpacity: number;
  flashDuration: number;
  traumaBoost: number;
  fovKick: number;
}

export const COMBO_MILESTONE_SPECS: Record<ComboMilestoneThreshold, ComboMilestoneSpec> = {
  20: {
    threshold: 20,
    title: '20 HIT MILESTONE!',
    subtitle: 'GOLDEN FRENZY BURST',
    sparkCount: 44,
    shockwaveRings: 2,
    primaryHex: '#facc15',
    secondaryHex: '#f59e0b',
    flashOpacity: 0.42,
    flashDuration: 0.55,
    traumaBoost: 0.55,
    fovKick: 5.5,
  },
  50: {
    threshold: 50,
    title: '50 HIT MILESTONE!',
    subtitle: 'SOLAR SUPERNOVA FLARE',
    sparkCount: 68,
    shockwaveRings: 3,
    primaryHex: '#fde047',
    secondaryHex: '#fb923c',
    flashOpacity: 0.58,
    flashDuration: 0.72,
    traumaBoost: 0.78,
    fovKick: 7.5,
  },
  100: {
    threshold: 100,
    title: '100 HIT MILESTONE!',
    subtitle: 'OMNI TRANSCENDENCE ERUPTION',
    sparkCount: 92,
    shockwaveRings: 4,
    primaryHex: '#fef08a',
    secondaryHex: '#38bdf8',
    flashOpacity: 0.74,
    flashDuration: 0.92,
    traumaBoost: 1.0,
    fovKick: 9.5,
  },
};

export function resolveComboMilestone(
  prevCombo: number,
  nextCombo: number
): ComboMilestoneSpec | null {
  if (nextCombo <= prevCombo) return null;
  let matched: ComboMilestoneSpec | null = null;
  for (const threshold of COMBO_MILESTONES) {
    if (prevCombo < threshold && nextCombo >= threshold) {
      matched = COMBO_MILESTONE_SPECS[threshold];
    }
  }
  return matched;
}

export function shouldTriggerEmoteSpotlight(
  comboCount: number,
  isFinisher: boolean
): boolean {
  return isFinisher || comboCount >= 5;
}
