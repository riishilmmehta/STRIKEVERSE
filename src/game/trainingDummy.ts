import type { DojoBlock, DummyVariantId, HeroClassId, HeroCustomization } from './types';

export type CampaignDummyAiPolicy = 'duelist' | 'charger' | 'flanker';

export interface TrainingDummySpec {
  id: DummyVariantId;
  label: string;
  shortLabel: string;
  actorName: string;
  actorTitle: string;
  aiPolicy: CampaignDummyAiPolicy | null;
  classId: HeroClassId;
  accentHex: string;
  patternHint: string;
  lessonHint: string;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  telegraphDuration: number;
  recoverInterval: number;
  leashRadius: number;
  engageRadius: number;
  appearance: Partial<HeroCustomization>;
}

export const TRAINING_DUMMY_ORDER: DummyVariantId[] = [
  'static',
  'kaito_duelist',
  'iron_charger',
  'vex_flanker',
];

export const TRAINING_DUMMY_VARIANTS: Record<DummyVariantId, TrainingDummySpec> = {
  static: {
    id: 'static',
    label: 'Classic Post',
    shortLabel: 'Classic',
    actorName: 'CLASSIC DUMMY',
    actorTitle: 'Stationary Combo Post',
    aiPolicy: null,
    classId: 'striker',
    accentHex: '#d97706',
    patternHint: 'Stationary wooden post for pure combo string & finisher timing',
    lessonHint: 'Practice J-J-K, J-K-K, and K-J-K chains freely without counter-attacks',
    maxHp: 0,
    attackDamage: 0,
    attackRange: 0,
    telegraphDuration: 0,
    recoverInterval: 0,
    leashRadius: 0,
    engageRadius: 0,
    appearance: {},
  },
  kaito_duelist: {
    id: 'kaito_duelist',
    label: 'Kaito · Duelist',
    shortLabel: 'Kaito',
    actorName: 'KAITO DUMMY',
    actorTitle: 'Campaign AI · Duelist',
    aiPolicy: 'duelist',
    classId: 'striker',
    accentHex: '#38bdf8',
    patternHint: 'Mimics Kaito: steady advancing strikes (0.56s gold flash) for Parry [L] drills',
    lessonHint: 'Tap Block [L / Q] when Kaito Dummy flashes gold to Perfect Parry & launch J-J-K!',
    maxHp: 180,
    attackDamage: 10,
    attackRange: 2.75,
    telegraphDuration: 0.56,
    recoverInterval: 1.05,
    leashRadius: 7.5,
    engageRadius: 8.5,
    appearance: {
      frame: 'balanced',
      skinColor: '#cbd5e1',
      topColor: '#1d4ed8',
      bottomColor: '#0f172a',
      accentColor: '#38bdf8',
      hairStyle: 'ponytail',
      hairColor: '#334155',
      weaponSkin: 'katana',
      headgear: 'headband',
      backAccessory: 'scarf',
      aura: 'cyan',
      pet: 'none',
    },
  },
  iron_charger: {
    id: 'iron_charger',
    label: 'Iron Bull · Charger',
    shortLabel: 'Iron Bull',
    actorName: 'IRON BULL DUMMY',
    actorTitle: 'Campaign AI · Charger',
    aiPolicy: 'charger',
    classId: 'juggernaut',
    accentHex: '#f97316',
    patternHint: 'Mimics Iron Bull: armored 0.68s windup into bull-rush charge for Parry & Dodge drills',
    lessonHint: 'Time Parry [L] on the 0.68s bull-rush flash or Dash [Shift] past to punish from behind!',
    maxHp: 230,
    attackDamage: 13,
    attackRange: 3.25,
    telegraphDuration: 0.68,
    recoverInterval: 1.3,
    leashRadius: 8.5,
    engageRadius: 9.2,
    appearance: {
      frame: 'heavy',
      skinColor: '#94a3b8',
      topColor: '#7f1d1d',
      bottomColor: '#1c1917',
      accentColor: '#f97316',
      hairStyle: 'mohawk',
      hairColor: '#f59e0b',
      weaponSkin: 'gauntlets',
      headgear: 'horns',
      backAccessory: 'thrusters',
      aura: 'crimson',
      pet: 'none',
    },
  },
  vex_flanker: {
    id: 'vex_flanker',
    label: 'Vex · Flanker',
    shortLabel: 'Vex',
    actorName: 'VEX PHANTOM DUMMY',
    actorTitle: 'Campaign AI · Flanker',
    aiPolicy: 'flanker',
    classId: 'phantom',
    accentHex: '#a855f7',
    patternHint: 'Mimics Vex Phantom: shadow-blinks behind you (0.50s flash) for 180° Parry drills',
    lessonHint: 'Watch for the violet blink behind you, tap Parry [L] on the 0.50s flash, then counter!',
    maxHp: 200,
    attackDamage: 11,
    attackRange: 2.7,
    telegraphDuration: 0.5,
    recoverInterval: 1.1,
    leashRadius: 8.5,
    engageRadius: 9.2,
    appearance: {
      frame: 'agile',
      skinColor: '#cbd5e1',
      topColor: '#3b0764',
      bottomColor: '#09090b',
      accentColor: '#c084fc',
      hairStyle: 'undercut',
      hairColor: '#e2e8f0',
      weaponSkin: 'katana',
      headgear: 'visor',
      backAccessory: 'wings',
      aura: 'violet',
      pet: 'none',
    },
  },
};

export function resolveDummyVariant(variant?: DummyVariantId): DummyVariantId {
  if (variant && variant in TRAINING_DUMMY_VARIANTS) {
    return variant;
  }
  return 'static';
}

export function getDummyVariantSpec(variant?: DummyVariantId): TrainingDummySpec {
  return TRAINING_DUMMY_VARIANTS[resolveDummyVariant(variant)];
}

export function isInteractiveDummyBlock(block: DojoBlock): boolean {
  if (block.type !== 'dummy') return false;
  return getDummyVariantSpec(block.dummyVariant).aiPolicy !== null;
}
