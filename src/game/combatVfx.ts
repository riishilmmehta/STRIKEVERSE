import type { ComboMoveSpec } from './combatRules';

export type HitImpactKind =
  | 'light'
  | 'heavy'
  | 'finisher'
  | 'parry'
  | 'block'
  | 'skill'
  | 'ultimate';

export interface HitVfxProfile {
  kind: HitImpactKind;
  sparkCount: number;
  sparkSpeed: number;
  flashScale: number;
  shockwaveScale: number;
  shakeTrauma: number;
  fovKick: number;
  hitstop: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface SlashArcProfile {
  radius: number;
  arcSpan: number;
  tiltX: number;
  tiltZ: number;
  yOffset: number;
  duration: number;
  sweepDir: 1 | -1;
}

export interface FloatingDamageNumber {
  id: number;
  value: string;
  label?: string;
  screenX: number; // 0..100 viewport percent
  screenY: number; // 0..100 viewport percent
  tone: 'light' | 'heavy' | 'finisher' | 'parry' | 'block';
  age: number;
  maxAge: number;
}

/**
 * Computes weight-scaled hit-spark, flash, trauma shake, FOV kick, and hitstop
 * parameters for any Light/Heavy combo move or defensive event.
 */
export function resolveHitVfxProfile(params: {
  move?: ComboMoveSpec | null;
  kindOverride?: HitImpactKind;
  auraHex: string;
  comboCount: number;
}): HitVfxProfile {
  const { move, kindOverride, auraHex, comboCount } = params;
  const comboBoost = Math.min(0.35, Math.max(0, comboCount - 1) * 0.06);

  let kind: HitImpactKind = kindOverride ?? 'light';
  if (!kindOverride && move) {
    if (move.isFinisher) kind = 'finisher';
    else if (move.sequence.includes('H') || move.damage >= 17) kind = 'heavy';
    else kind = 'light';
  }

  switch (kind) {
    case 'parry':
      return {
        kind,
        sparkCount: 30,
        sparkSpeed: 12.5,
        flashScale: 1.9,
        shockwaveScale: 4.8,
        shakeTrauma: 0.56,
        fovKick: 3.4,
        hitstop: 0.085,
        primaryColor: '#fef08a',
        secondaryColor: '#f59e0b',
      };
    case 'block':
      return {
        kind,
        sparkCount: 12,
        sparkSpeed: 7.2,
        flashScale: 0.9,
        shockwaveScale: 2.0,
        shakeTrauma: 0.18,
        fovKick: 0.8,
        hitstop: 0.025,
        primaryColor: '#bae6fd',
        secondaryColor: '#38bdf8',
      };
    case 'ultimate':
      return {
        kind,
        sparkCount: 54,
        sparkSpeed: 16.0,
        flashScale: 2.8,
        shockwaveScale: 9.5,
        shakeTrauma: 0.92,
        fovKick: 5.5,
        hitstop: 0.1,
        primaryColor: '#ffffff',
        secondaryColor: auraHex,
      };
    case 'skill':
      return {
        kind,
        sparkCount: 32,
        sparkSpeed: 12.0,
        flashScale: 1.85,
        shockwaveScale: 4.6,
        shakeTrauma: 0.52,
        fovKick: 3.0,
        hitstop: 0.06,
        primaryColor: '#ffffff',
        secondaryColor: auraHex,
      };
    case 'finisher':
      return {
        kind,
        sparkCount: Math.round(34 * (1 + comboBoost)),
        sparkSpeed: 13.5,
        flashScale: 2.15,
        shockwaveScale: 4.4,
        shakeTrauma: Math.min(0.88, 0.62 + comboBoost * 0.4),
        fovKick: 4.2,
        hitstop: move?.hitstop ?? 0.08,
        primaryColor: '#fffbeb',
        secondaryColor: auraHex,
      };
    case 'heavy':
      return {
        kind,
        sparkCount: Math.round(24 * (1 + comboBoost)),
        sparkSpeed: 10.8,
        flashScale: 1.55,
        shockwaveScale: 3.2,
        shakeTrauma: Math.min(0.7, 0.44 + comboBoost * 0.35),
        fovKick: 2.8,
        hitstop: move?.hitstop ?? 0.055,
        primaryColor: '#fef3c7',
        secondaryColor: auraHex,
      };
    case 'light':
    default:
      return {
        kind: 'light',
        sparkCount: Math.round(14 * (1 + comboBoost)),
        sparkSpeed: 8.2,
        flashScale: 1.05,
        shockwaveScale: 1.9,
        shakeTrauma: Math.min(0.42, 0.24 + comboBoost * 0.25),
        fovKick: 1.4,
        hitstop: move?.hitstop ?? 0.028,
        primaryColor: '#ffffff',
        secondaryColor: auraHex,
      };
  }
}

/**
 * Maps each Light/Heavy move's animation style to a 3D weapon slash-arc orientation
 * synced with the move's existing windup -> active timing.
 */
export function resolveSlashArcProfile(move: ComboMoveSpec): SlashArcProfile {
  const duration = Math.max(0.14, move.active * 1.45);
  switch (move.animStyle) {
    case 'jab':
      return { radius: 1.45, arcSpan: 1.6, tiltX: 0.12, tiltZ: 0.22, yOffset: 1.32, duration, sweepDir: 1 };
    case 'cross':
      return { radius: 1.65, arcSpan: 2.1, tiltX: -0.1, tiltZ: -0.25, yOffset: 1.3, duration, sweepDir: -1 };
    case 'flurry':
      return { radius: 1.85, arcSpan: 3.4, tiltX: 0.15, tiltZ: 0.35, yOffset: 1.28, duration: duration * 1.2, sweepDir: 1 };
    case 'uppercut':
      return { radius: 1.95, arcSpan: 2.6, tiltX: 0.0, tiltZ: 1.35, yOffset: 1.35, duration: duration * 1.15, sweepDir: 1 };
    case 'sweep':
      return { radius: 2.05, arcSpan: 3.9, tiltX: 0.05, tiltZ: 0.08, yOffset: 0.58, duration: duration * 1.15, sweepDir: -1 };
    case 'spin_kick':
      return { radius: 2.0, arcSpan: 3.8, tiltX: -0.08, tiltZ: -0.15, yOffset: 1.15, duration: duration * 1.15, sweepDir: 1 };
    case 'heavy_slash':
      return { radius: 2.15, arcSpan: 2.8, tiltX: 0.18, tiltZ: -0.65, yOffset: 1.32, duration: duration * 1.2, sweepDir: -1 };
    case 'slam':
      return { radius: 2.25, arcSpan: 2.9, tiltX: 0.0, tiltZ: 1.48, yOffset: 1.4, duration: duration * 1.25, sweepDir: -1 };
  }
}

export interface CameraShakeSample {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rollZ: number;
}

/**
 * Trauma-squared directional & roll camera shake using layered harmonic waves
 * so impacts feel snappy, physical, and never visually nauseating.
 */
export function sampleCameraShake(trauma: number, timeSec: number): CameraShakeSample {
  const clamped = Math.max(0, Math.min(1, trauma));
  if (clamped <= 0.001) {
    return { offsetX: 0, offsetY: 0, offsetZ: 0, rollZ: 0 };
  }
  const intensity = clamped * clamped;
  const x = (Math.sin(timeSec * 67.0) * 0.65 + Math.cos(timeSec * 113.0) * 0.35) * intensity * 0.55;
  const y = (Math.cos(timeSec * 79.0) * 0.6 + Math.sin(timeSec * 131.0) * 0.4) * intensity * 0.46;
  const z = Math.sin(timeSec * 53.0) * intensity * 0.22;
  const rollZ = Math.sin(timeSec * 61.0) * intensity * 0.042;
  return { offsetX: x, offsetY: y, offsetZ: z, rollZ };
}

export function decayCameraTrauma(trauma: number, dt: number): number {
  return Math.max(0, trauma - dt * 2.35);
}

export type FrenzyTier = 'none' | 'building' | 'frenzy' | 'overdrive';

export interface ComboFrenzyEffect {
  intensity: number; // 0..1 normalized frenzy strength
  chromaticOffset: number; // UV-space radial RGB shift
  distortionStrength: number; // radial lens barrel distortion
  vignetteStrength: number; // peripheral adrenaline focus & aura tint
  fovBoost: number; // extra camera FOV degrees
  tier: FrenzyTier;
}

/**
 * Computes progressive camera distortion, chromatic aberration, peripheral aura
 * vignette, and FOV boost as the player's combo chain escalates into a frenzy state.
 */
export function computeComboFrenzyEffect(params: {
  comboCount: number;
  comboTimer: number;
  maxDuration?: number;
  impactPulse?: number;
  isUltimate?: boolean;
}): ComboFrenzyEffect {
  const {
    comboCount,
    comboTimer,
    maxDuration = 2.4,
    impactPulse = 0,
    isUltimate = false,
  } = params;

  const safePulse = Math.max(0, Math.min(1, impactPulse));
  const safeTimer = Math.max(0, comboTimer);
  const safeMax = Math.max(0.1, maxDuration);

  // Smooth fade-out during the final 0.45s of the combo window so distortion releases organically
  const tailFade = comboCount > 0 ? Math.min(1, safeTimer / Math.min(0.45, safeMax)) : 0;
  // Nonlinear escalation: subtle at 1-2 hits, crisp frenzy at 3-6, peak overdrive at 10-12+
  const chainNorm = comboCount > 0 ? Math.min(1, Math.pow(comboCount / 11, 0.78)) : 0;
  const comboBase = chainNorm * tailFade;
  const ultimateFloor = isUltimate ? 0.92 : 0;

  const intensity = Math.max(
    0,
    Math.min(1, Math.max(comboBase, ultimateFloor) + safePulse * 0.24)
  );

  let tier: FrenzyTier = 'none';
  if (isUltimate || comboCount >= 8) tier = 'overdrive';
  else if (comboCount >= 4) tier = 'frenzy';
  else if (comboCount >= 1 && safeTimer > 0) tier = 'building';

  return {
    intensity,
    chromaticOffset: Number((intensity * 0.0115).toFixed(5)),
    distortionStrength: Number((intensity * 0.088).toFixed(5)),
    vignetteStrength: Number((intensity * 0.34).toFixed(5)),
    fovBoost: Number((intensity * 4.8).toFixed(3)),
    tier,
  };
}

