import type {
  AttackInput,
  AuraColorId,
  BodyFrameId,
  DailyQuest,
  HeroClassId,
  HeroCustomization,
  PetTypeId,
} from './types';

export interface ClassSpec {
  id: HeroClassId;
  name: string;
  role: string;
  description: string;
  maxHp: number;
  moveSpeed: number;
  attackPower: number;
  attackSpeed: number;
  staggerResist: number;
  skillName: string;
  skillDesc: string;
  skillCooldown: number;
  skillDamage: number;
  skillRange: number;
  skillKind: 'dash_strike' | 'ground_slam' | 'blink_strike' | 'energy_volley' | 'turret_shield';
  ultimateName: string;
  defaultWeapon: HeroCustomization['weaponSkin'];
  defaultAura: AuraColorId;
  signatureColor: string;
}

export const HERO_CLASSES: Record<HeroClassId, ClassSpec> = {
  striker: {
    id: 'striker',
    name: 'Striker',
    role: 'Balanced · Fast Combo Chains',
    description: 'Fluid martial artist built for rapid Light/Heavy sequences and rising launchers.',
    maxHp: 120,
    moveSpeed: 7.4,
    attackPower: 1.0,
    attackSpeed: 1.08,
    staggerResist: 0.1,
    skillName: 'Solar Dash Palm',
    skillDesc: 'Blazing forward lunge that breaks guards and extends combos.',
    skillCooldown: 4.5,
    skillDamage: 26,
    skillRange: 5.2,
    skillKind: 'dash_strike',
    ultimateName: 'SUPERNOVA BARRAGE',
    defaultWeapon: 'tonfa',
    defaultAura: 'solar',
    signatureColor: '#f59e0b',
  },
  juggernaut: {
    id: 'juggernaut',
    name: 'Juggernaut',
    role: 'Heavy · High Impact Armor',
    description: 'Armored powerhouse whose strikes shrug off flinch and send foes into walls.',
    maxHp: 145,
    moveSpeed: 6.4,
    attackPower: 1.18,
    attackSpeed: 0.92,
    staggerResist: 0.45,
    skillName: 'Seismic Slam',
    skillDesc: 'Shockwave ground smash launching every nearby opponent.',
    skillCooldown: 5.5,
    skillDamage: 32,
    skillRange: 4.4,
    skillKind: 'ground_slam',
    ultimateName: 'TITAN EARTHSHAKER',
    defaultWeapon: 'gauntlets',
    defaultAura: 'crimson',
    signatureColor: '#ef4444',
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom',
    role: 'Agile · Teleport Flanker',
    description: 'Lightning-quick assassin with blink strikes and devastating air juggles.',
    maxHp: 105,
    moveSpeed: 8.3,
    attackPower: 1.06,
    attackSpeed: 1.18,
    staggerResist: 0.0,
    skillName: 'Shadowstep Blink',
    skillDesc: 'Teleport behind your target for a critical back-slash.',
    skillCooldown: 4.0,
    skillDamage: 28,
    skillRange: 7.5,
    skillKind: 'blink_strike',
    ultimateName: 'ECLIPSE SEVERANCE',
    defaultWeapon: 'katana',
    defaultAura: 'violet',
    signatureColor: '#a855f7',
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    role: 'Mid-Range · Energy Arcs',
    description: 'Kinetic marksman combining staff sweeps with crackling plasma volleys.',
    maxHp: 112,
    moveSpeed: 7.5,
    attackPower: 0.98,
    attackSpeed: 1.05,
    staggerResist: 0.05,
    skillName: 'Arc Bolt Volley',
    skillDesc: 'Fires three piercing kinetic bolts that stagger targets at range.',
    skillCooldown: 4.2,
    skillDamage: 24,
    skillRange: 10.5,
    skillKind: 'energy_volley',
    ultimateName: 'HYPERION RAILBEAM',
    defaultWeapon: 'staff',
    defaultAura: 'cyan',
    signatureColor: '#06b6d4',
  },
  support: {
    id: 'support',
    name: 'Support / Tech',
    role: 'Gadgets · Shield & Pulse',
    description: 'Tactical specialist deploying an energy Aegis dome and pulse shockwaves.',
    maxHp: 125,
    moveSpeed: 7.1,
    attackPower: 0.96,
    attackSpeed: 1.02,
    staggerResist: 0.2,
    skillName: 'Aegis Pulse Turret',
    skillDesc: 'Restores 18 HP and blasts nearby enemies with a tech shockwave.',
    skillCooldown: 6.0,
    skillDamage: 22,
    skillRange: 5.0,
    skillKind: 'turret_shield',
    ultimateName: 'ORBITAL OVERDRIVE',
    defaultWeapon: 'staff',
    defaultAura: 'emerald',
    signatureColor: '#10b981',
  },
};

export interface FrameModifiers {
  id: BodyFrameId;
  label: string;
  speedMult: number;
  powerMult: number;
  torsoWidth: number;
  limbScale: number;
}

export const BODY_FRAMES: Record<BodyFrameId, FrameModifiers> = {
  agile: {
    id: 'agile',
    label: 'Agile',
    speedMult: 1.06,
    powerMult: 0.96,
    torsoWidth: 0.88,
    limbScale: 0.92,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    speedMult: 1.0,
    powerMult: 1.0,
    torsoWidth: 1.0,
    limbScale: 1.0,
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy',
    speedMult: 0.94,
    powerMult: 1.06,
    torsoWidth: 1.18,
    limbScale: 1.12,
  },
};

export const AURA_HEX: Record<AuraColorId, string> = {
  solar: '#f59e0b',
  cyan: '#06b6d4',
  crimson: '#ef4444',
  emerald: '#10b981',
  violet: '#a855f7',
};

export const DEFAULT_CUSTOMIZATION: HeroCustomization = {
  name: 'KAIRO',
  classId: 'striker',
  frame: 'balanced',
  skinColor: '#d99b72',
  hairStyle: 'spiky',
  hairColor: '#1e293b',
  topColor: '#e2e8f0',
  bottomColor: '#1e293b',
  accentColor: '#f59e0b',
  headgear: 'headband',
  backAccessory: 'scarf',
  weaponSkin: 'tonfa',
  aura: 'solar',
  pet: 'drone',
};

export interface PetAbilitySpec {
  id: PetTypeId;
  petName: string;
  abilityName: string;
  description: string;
  passiveLabel: string;
  cooldown: number;
  damage: number;
  healHp: number;
  restoreStamina: number;
  stunDuration: number;
  range: number;
  kind: 'none' | 'photon_barrage' | 'phantom_pounce' | 'aegis_nova';
  colorHex: string;
  speedBonusMult: number;
  maxHpBonus: number;
  ultGainMult: number;
}

export const PET_ABILITIES: Record<PetTypeId, PetAbilitySpec> = {
  none: {
    id: 'none',
    petName: 'No Pet',
    abilityName: 'None',
    description: 'Fight solo without a companion ability.',
    passiveLabel: 'Solo Focus',
    cooldown: 0,
    damage: 0,
    healHp: 0,
    restoreStamina: 0,
    stunDuration: 0,
    range: 0,
    kind: 'none',
    colorHex: '#94a3b8',
    speedBonusMult: 1.0,
    maxHpBonus: 0,
    ultGainMult: 1.0,
  },
  drone: {
    id: 'drone',
    petName: 'Pulse Drone',
    abilityName: 'Photon Barrage',
    description: 'Fires 3 rapid plasma bolts that stagger foes and extend your combo chain.',
    passiveLabel: '+12% Ult Charge',
    cooldown: 6.5,
    damage: 11,
    healHp: 0,
    restoreStamina: 0,
    stunDuration: 0.45,
    range: 13.5,
    kind: 'photon_barrage',
    colorHex: '#38bdf8',
    speedBonusMult: 1.0,
    maxHpBonus: 0,
    ultGainMult: 1.12,
  },
  fox: {
    id: 'fox',
    petName: 'Spirit Fox',
    abilityName: 'Phantom Pounce',
    description: 'Dashes forward in a blazing lunge for heavy strike damage and a 1.2s stun.',
    passiveLabel: '+6% Move Speed',
    cooldown: 7.0,
    damage: 26,
    healHp: 0,
    restoreStamina: 0,
    stunDuration: 1.2,
    range: 8.5,
    kind: 'phantom_pounce',
    colorHex: '#fb923c',
    speedBonusMult: 1.06,
    maxHpBonus: 0,
    ultGainMult: 1.0,
  },
  orb: {
    id: 'orb',
    petName: 'Aether Orb',
    abilityName: 'Aegis Nova',
    description: 'Restores 22 HP & 35 Stamina while blasting nearby enemies back.',
    passiveLabel: '+10 Max HP',
    cooldown: 8.0,
    damage: 18,
    healHp: 22,
    restoreStamina: 35,
    stunDuration: 0.55,
    range: 5.4,
    kind: 'aegis_nova',
    colorHex: '#34d399',
    speedBonusMult: 1.0,
    maxHpBonus: 10,
    ultGainMult: 1.0,
  },
};

export interface ComboMoveSpec {
  sequence: string;
  name: string;
  damage: number;
  windup: number;
  active: number;
  recovery: number;
  range: number;
  knockback: number;
  launchY: number;
  hitstop: number;
  lunge: number;
  isFinisher: boolean;
  finisherBonusMult?: number;
  slowMoDuration?: number;
  slowMoTimeScale?: number;
  animStyle: 'jab' | 'cross' | 'flurry' | 'uppercut' | 'sweep' | 'slam' | 'heavy_slash' | 'spin_kick';
}

export const COMBO_TABLE: Record<string, ComboMoveSpec> = {
  L: {
    sequence: 'L',
    name: 'Quick Jab',
    damage: 10,
    windup: 0.08,
    active: 0.11,
    recovery: 0.16,
    range: 2.35,
    knockback: 2.2,
    launchY: 0,
    hitstop: 0.025,
    lunge: 1.8,
    isFinisher: false,
    animStyle: 'jab',
  },
  LL: {
    sequence: 'LL',
    name: 'Twin Strike',
    damage: 13,
    windup: 0.08,
    active: 0.12,
    recovery: 0.17,
    range: 2.5,
    knockback: 3.0,
    launchY: 0,
    hitstop: 0.032,
    lunge: 2.4,
    isFinisher: false,
    animStyle: 'cross',
  },
  LLL: {
    sequence: 'LLL',
    name: 'Cyclone Rush',
    damage: 18,
    windup: 0.1,
    active: 0.14,
    recovery: 0.24,
    range: 2.75,
    knockback: 6.2,
    launchY: 1.6,
    hitstop: 0.055,
    lunge: 3.1,
    isFinisher: true,
    finisherBonusMult: 1.25,
    slowMoDuration: 0.48,
    slowMoTimeScale: 0.34,
    animStyle: 'flurry',
  },
  LLH: {
    sequence: 'LLH',
    name: 'Skyward Launcher',
    damage: 24,
    windup: 0.13,
    active: 0.15,
    recovery: 0.28,
    range: 2.9,
    knockback: 5.8,
    launchY: 6.4,
    hitstop: 0.07,
    lunge: 3.2,
    isFinisher: true,
    finisherBonusMult: 1.4,
    slowMoDuration: 0.65,
    slowMoTimeScale: 0.28,
    animStyle: 'uppercut',
  },
  LH: {
    sequence: 'LH',
    name: 'Crescent Sweep',
    damage: 17,
    windup: 0.11,
    active: 0.13,
    recovery: 0.2,
    range: 2.7,
    knockback: 4.2,
    launchY: 2.2,
    hitstop: 0.045,
    lunge: 2.6,
    isFinisher: false,
    animStyle: 'sweep',
  },
  LHH: {
    sequence: 'LHH',
    name: 'Meteor Slam',
    damage: 28,
    windup: 0.16,
    active: 0.16,
    recovery: 0.3,
    range: 3.1,
    knockback: 11.5,
    launchY: 3.4,
    hitstop: 0.08,
    lunge: 3.8,
    isFinisher: true,
    finisherBonusMult: 1.45,
    slowMoDuration: 0.72,
    slowMoTimeScale: 0.25,
    animStyle: 'slam',
  },
  H: {
    sequence: 'H',
    name: 'Power Cleave',
    damage: 18,
    windup: 0.16,
    active: 0.14,
    recovery: 0.24,
    range: 2.8,
    knockback: 6.0,
    launchY: 1.4,
    hitstop: 0.05,
    lunge: 2.8,
    isFinisher: false,
    animStyle: 'heavy_slash',
  },
  HL: {
    sequence: 'HL',
    name: 'Guard Breaker',
    damage: 20,
    windup: 0.11,
    active: 0.13,
    recovery: 0.22,
    range: 2.7,
    knockback: 7.4,
    launchY: 1.8,
    hitstop: 0.055,
    lunge: 3.0,
    isFinisher: false,
    animStyle: 'spin_kick',
  },
  HLH: {
    sequence: 'HLH',
    name: 'Dragon Finisher',
    damage: 30,
    windup: 0.15,
    active: 0.16,
    recovery: 0.3,
    range: 3.15,
    knockback: 12.2,
    launchY: 5.0,
    hitstop: 0.085,
    lunge: 4.0,
    isFinisher: true,
    finisherBonusMult: 1.5,
    slowMoDuration: 0.78,
    slowMoTimeScale: 0.24,
    animStyle: 'uppercut',
  },
  HH: {
    sequence: 'HH',
    name: 'Titan Impact',
    damage: 27,
    windup: 0.19,
    active: 0.15,
    recovery: 0.32,
    range: 3.0,
    knockback: 12.8,
    launchY: 3.0,
    hitstop: 0.085,
    lunge: 3.5,
    isFinisher: true,
    finisherBonusMult: 1.35,
    slowMoDuration: 0.58,
    slowMoTimeScale: 0.3,
    animStyle: 'slam',
  },
};

export interface ComboResolution {
  nextSequence: string;
  move: ComboMoveSpec;
  resetChain: boolean;
}

export const COMBO_DECAY_DURATION = 2.4;

export function getComboLinkWindow(autoAssist: boolean): number {
  return autoAssist ? 0.95 : 0.62;
}

/**
 * Resolves the next Light/Heavy sequence move without fighting-game motion inputs.
 * Widens the combo chain link window when Auto-Assist is enabled so beginners land 3-hit combos effortlessly.
 */
export function resolveComboStep(
  currentSequence: string,
  input: AttackInput,
  timeSinceLastMoveEnd: number,
  autoAssist: boolean
): ComboResolution {
  const linkWindow = getComboLinkWindow(autoAssist);
  const baseSeq = timeSinceLastMoveEnd <= linkWindow ? currentSequence : '';
  const candidate = baseSeq + input;

  if (COMBO_TABLE[candidate]) {
    const move = COMBO_TABLE[candidate];
    return {
      nextSequence: move.isFinisher ? '' : candidate,
      move,
      resetChain: move.isFinisher,
    };
  }

  // Fallback to fresh starter if sequence ended or invalid continuation
  const fallback = COMBO_TABLE[input];
  return {
    nextSequence: input,
    move: fallback,
    resetChain: false,
  };
}

/**
 * Returns the extra damage for a Combo Finisher strike (applying its signature bonus multiplier).
 */
export function computeFinisherMoveDamage(move: ComboMoveSpec): number {
  if (!move.isFinisher) return move.damage;
  return Math.round(move.damage * (move.finisherBonusMult ?? 1.35));
}

/**
 * Suggests the next Heavy/Light finisher button for the player's current active sequence
 * so players naturally discover slow-motion Combo Finishers in live combat.
 */
export function resolveNextFinisherHint(currentSequence: string): string | null {
  if (!currentSequence) return null;
  const heavyNext = COMBO_TABLE[`${currentSequence}H`];
  if (heavyNext?.isFinisher) {
    return `[K] → ${heavyNext.name}`;
  }
  const lightNext = COMBO_TABLE[`${currentSequence}L`];
  if (lightNext?.isFinisher) {
    return `[J] → ${lightNext.name}`;
  }
  if (currentSequence === 'L') {
    return `[J]-[K] → Skyward Launcher`;
  }
  return null;
}

export interface BufferedInput {
  action: 'L' | 'H' | 'skill' | 'pet' | 'dodge' | 'jump' | 'parry';
  timestamp: number;
}

export function getInputBufferWindow(autoAssist: boolean): number {
  return autoAssist ? 0.22 : 0.15;
}

export function consumeBufferedInput(
  buffer: BufferedInput | null,
  nowSec: number,
  autoAssist: boolean
): BufferedInput['action'] | null {
  if (!buffer) return null;
  if (nowSec - buffer.timestamp <= getInputBufferWindow(autoAssist)) {
    return buffer.action;
  }
  return null;
}

export interface DefenseResult {
  outcome: 'parry' | 'block' | 'hit';
  finalDamage: number;
  staminaCost: number;
  attackerStunDuration: number;
  defenderUltGain: number;
  knockbackMult: number;
}

/**
 * Evaluates Block (70% reduction) vs Perfect Parry (220ms / 280ms with auto-assist -> 0 damage + attacker stun).
 */
export function resolveIncomingHit(params: {
  rawDamage: number;
  isBlocking: boolean;
  timeSinceBlockPress: number;
  defenderStamina: number;
  autoAssist: boolean;
  isUnblockable?: boolean;
}): DefenseResult {
  const parryWindow = params.autoAssist ? 0.28 : 0.22;

  if (
    params.isBlocking &&
    !params.isUnblockable &&
    params.timeSinceBlockPress <= parryWindow
  ) {
    return {
      outcome: 'parry',
      finalDamage: 0,
      staminaCost: 0,
      attackerStunDuration: 1.35,
      defenderUltGain: 22,
      knockbackMult: 0,
    };
  }

  if (params.isBlocking && !params.isUnblockable && params.defenderStamina >= 12) {
    return {
      outcome: 'block',
      finalDamage: Math.max(1, Math.round(params.rawDamage * 0.3)),
      staminaCost: 16,
      attackerStunDuration: 0,
      defenderUltGain: 7,
      knockbackMult: 0.35,
    };
  }

  return {
    outcome: 'hit',
    finalDamage: Math.max(1, Math.round(params.rawDamage)),
    staminaCost: 0,
    attackerStunDuration: 0,
    defenderUltGain: 10,
    knockbackMult: 1.0,
  };
}

export function computeScaledDamage(
  baseDamage: number,
  classId: HeroClassId,
  frame: BodyFrameId,
  comboCount: number,
  isCounterOrStunned: boolean
): number {
  const cls = HERO_CLASSES[classId];
  const frm = BODY_FRAMES[frame];
  // Mild combo scaling rewards chaining without one-shotting
  const comboBonus = 1 + Math.min(comboCount, 6) * 0.05;
  const counterMult = isCounterOrStunned ? 1.25 : 1.0;
  return Math.round(baseDamage * cls.attackPower * frm.powerMult * comboBonus * counterMult);
}

export type ComboRank = 'C' | 'B' | 'A' | 'S' | 'S+';

export interface ComboMeterState {
  active: boolean;
  rank: ComboRank;
  tierLabel: string;
  progress: number; // 0..1 remaining window fraction
  secondsRemaining: number;
  isUrgent: boolean;
  damageBonusPct: number;
}

/**
 * Computes visual rank tier, damage scaling bonus, and decaying window-timer progress
 * for the HUD Combo Meter.
 */
export function computeComboMeterState(
  comboCount: number,
  timeRemaining: number,
  maxDuration = COMBO_DECAY_DURATION
): ComboMeterState {
  const safeMax = Math.max(0.1, maxDuration);
  const clampedTime = Math.max(0, Math.min(safeMax, timeRemaining));
  const active = comboCount > 0 && clampedTime > 0;
  const progress = active ? clampedTime / safeMax : 0;

  let rank: ComboRank = 'C';
  let tierLabel = 'CHAIN';
  if (comboCount >= 12) {
    rank = 'S+';
    tierLabel = 'STRIKEVERSE';
  } else if (comboCount >= 8) {
    rank = 'S';
    tierLabel = 'OVERDRIVE';
  } else if (comboCount >= 5) {
    rank = 'A';
    tierLabel = 'FLOW';
  } else if (comboCount >= 3) {
    rank = 'B';
    tierLabel = 'STRIKER';
  }

  return {
    active,
    rank,
    tierLabel,
    progress,
    secondsRemaining: Number(clampedTime.toFixed(1)),
    isUrgent: active && progress <= 0.3,
    damageBonusPct: Math.min(comboCount, 6) * 5,
  };
}

export function computeHeroMaxHp(classId: HeroClassId, level: number): number {
  const base = HERO_CLASSES[classId].maxHp;
  // GDD rule: Cap progression power growth to <= 15% so beginners are never crushed by veterans
  const levelBonus = Math.min(0.15, Math.max(0, level - 1) * 0.015);
  return Math.round(base * (1 + levelBonus));
}

export function computeHeroSpeed(classId: HeroClassId, frame: BodyFrameId): number {
  return HERO_CLASSES[classId].moveSpeed * BODY_FRAMES[frame].speedMult;
}

export const WALL_BOUNCE_BONUS_DAMAGE = 20;
export const CRATE_SMASH_BONUS_DAMAGE = 24;
export const DODGE_STAMINA_COST = 26;
export const MAX_STAMINA = 100;
export const STAMINA_REGEN_PER_SEC = 26;

export function stepStamina(
  current: number,
  dt: number,
  isBlocking: boolean,
  timeSinceAction: number
): number {
  if (isBlocking) {
    return Math.max(0, current - 8 * dt);
  }
  if (timeSinceAction < 0.45) {
    return current;
  }
  return Math.min(MAX_STAMINA, current + STAMINA_REGEN_PER_SEC * dt);
}

export function gainUltimateMeter(current: number, delta: number): number {
  return Math.min(100, Math.max(0, current + delta));
}

export interface CampaignBossSpec {
  index: number;
  name: string;
  title: string;
  classId: HeroClassId;
  aiPolicy: 'duelist' | 'charger' | 'flanker';
  maxHp: number;
  damageScale: number;
  lessonTitle: string;
  lessonHint: string;
  rewardCoins: number;
  appearance: Partial<HeroCustomization>;
}

export const CAMPAIGN_BOSSES: CampaignBossSpec[] = [
  {
    index: 0,
    name: 'KAITO',
    title: 'Blade of the Azure Gate',
    classId: 'striker',
    aiPolicy: 'duelist',
    maxHp: 165,
    damageScale: 0.9,
    lessonTitle: 'Trial 1 · Parry Timing',
    lessonHint: 'Tap Block [L / Q] when Kaito flashes gold to trigger a Perfect Parry & stun!',
    rewardCoins: 180,
    appearance: {
      topColor: '#1d4ed8',
      bottomColor: '#0f172a',
      accentColor: '#38bdf8',
      hairStyle: 'ponytail',
      hairColor: '#0f172a',
      weaponSkin: 'katana',
      headgear: 'headband',
      backAccessory: 'scarf',
      aura: 'cyan',
    },
  },
  {
    index: 1,
    name: 'IRON BULL',
    title: 'Colosseum Breaker',
    classId: 'juggernaut',
    aiPolicy: 'charger',
    maxHp: 220,
    damageScale: 1.05,
    lessonTitle: 'Trial 2 · Arena Knockback',
    lessonHint: 'Finish combos with Heavy [K] to smash Iron Bull into crates & pillars for bonus damage!',
    rewardCoins: 260,
    appearance: {
      frame: 'heavy',
      topColor: '#7f1d1d',
      bottomColor: '#1c1917',
      accentColor: '#f97316',
      hairStyle: 'mohawk',
      hairColor: '#f59e0b',
      weaponSkin: 'gauntlets',
      headgear: 'horns',
      backAccessory: 'thrusters',
      aura: 'crimson',
    },
  },
  {
    index: 2,
    name: 'VEX PHANTOM',
    title: 'Sovereign of the Spire',
    classId: 'phantom',
    aiPolicy: 'flanker',
    maxHp: 255,
    damageScale: 1.15,
    lessonTitle: 'Trial 3 · Skill-Cancel Mastery',
    lessonHint: 'Chain Light-Light-Heavy [J-J-K] into Skill [U / E] and unleash your Ultimate [I / R]!',
    rewardCoins: 400,
    appearance: {
      frame: 'agile',
      topColor: '#3b0764',
      bottomColor: '#09090b',
      accentColor: '#c084fc',
      hairStyle: 'undercut',
      hairColor: '#e2e8f0',
      weaponSkin: 'katana',
      headgear: 'visor',
      backAccessory: 'wings',
      aura: 'violet',
    },
  },
];

export const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'q_combo',
    label: 'Land 15 Melee Hits',
    progress: 0,
    target: 15,
    reward: 120,
    completed: false,
  },
  {
    id: 'q_parry',
    label: 'Land 2 Perfect Parries',
    progress: 0,
    target: 2,
    reward: 150,
    completed: false,
  },
  {
    id: 'q_win',
    label: 'Win an Arena or Boss Match',
    progress: 0,
    target: 1,
    reward: 200,
    completed: false,
  },
];

export function formatSequenceBadge(seq: string): string {
  if (!seq) return '';
  return seq.split('').join(' · ');
}
