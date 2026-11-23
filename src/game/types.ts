export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type WorldZone = 'hub' | 'arena' | 'campaign' | 'dojo' | 'royale';

export type HeroClassId = 'striker' | 'juggernaut' | 'phantom' | 'ranger' | 'support';

export type BodyFrameId = 'agile' | 'balanced' | 'heavy';

export type HairStyleId =
  | 'spiky'
  | 'undercut'
  | 'ponytail'
  | 'locs'
  | 'mohawk'
  | 'twinbuns';

export type HeadgearId = 'none' | 'visor' | 'headband' | 'horns';

export type BackAccessoryId = 'none' | 'scarf' | 'wings' | 'thrusters';

export type WeaponSkinId = 'tonfa' | 'katana' | 'gauntlets' | 'staff';

export type AuraColorId = 'solar' | 'cyan' | 'crimson' | 'emerald' | 'violet';

export type PetTypeId = 'none' | 'drone' | 'fox' | 'orb';

export type EmoteId = 'flex' | 'shadowbox' | 'bow' | 'dance';

export type AttackInput = 'L' | 'H';

export interface HeroCustomization {
  name: string;
  classId: HeroClassId;
  frame: BodyFrameId;
  skinColor: string;
  hairStyle: HairStyleId;
  hairColor: string;
  topColor: string;
  bottomColor: string;
  accentColor: string;
  headgear: HeadgearId;
  backAccessory: BackAccessoryId;
  weaponSkin: WeaponSkinId;
  aura: AuraColorId;
  pet: PetTypeId;
}

export type DojoBlockType =
  | 'dummy'
  | 'trampoline'
  | 'dashpad'
  | 'crate'
  | 'lantern'
  | 'trophy';

export interface DojoBlock {
  id: string;
  type: DojoBlockType;
  x: number;
  z: number;
  rotation: number;
}

export interface VisitedDojoSummary {
  id: string;
  ownerName: string;
  dojoName: string;
  themeTag: string;
}

export interface CombatCallout {
  id: number;
  text: string;
  subtext?: string;
  tone: 'amber' | 'cyan' | 'rose' | 'emerald';
}

export interface PortalPrompt {
  zone: WorldZone | 'customize';
  label: string;
  subtitle: string;
}

export interface OpponentHudState {
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  ghostHp: number;
  staggered: boolean;
  telegraphing: boolean;
  lessonHint?: string;
}

import type { FloatingDamageNumber } from './combatVfx';

export interface HudSnapshot {
  zone: WorldZone;
  hp: number;
  maxHp: number;
  ghostHp: number;
  stamina: number;
  maxStamina: number;
  ultimate: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  skillName: string;
  comboCount: number;
  comboMoveName: string;
  comboSequence: string;
  comboTimer: number;
  comboMaxTimer: number;
  finisherActive: boolean;
  finisherName: string;
  nextFinisherHint: string | null;
  petType: PetTypeId;
  petAbilityName: string;
  petCooldown: number;
  petMaxCooldown: number;
  isBlocking: boolean;
  isUltimateActive: boolean;
  autoAssist: boolean;
  coins: number;
  level: number;
  xp: number;
  xpToNext: number;
  wins: number;
  highestBossCleared: number;
  activeBossIndex: number;
  opponent: OpponentHudState | null;
  royaleAlive: number;
  royaleTotal: number;
  royaleRingRadius: number;
  portalPrompt: PortalPrompt | null;
  callout: CombatCallout | null;
  damagePopups: FloatingDamageNumber[];
  dojoMode: 'play' | 'build';
  selectedDojoBlock: DojoBlockType;
  dojoBlockCount: number;
  visitingDojo: VisitedDojoSummary | null;
  muted: boolean;
  dailyQuests: DailyQuest[];
}

export interface DailyQuest {
  id: string;
  label: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
}

export interface MatchSummary {
  victory: boolean;
  mode: WorldZone;
  title: string;
  subtitle: string;
  elapsedSeconds: number;
  maxCombo: number;
  parriesLanded: number;
  damageDealt: number;
  coinsEarned: number;
  xpEarned: number;
  bossIndex?: number;
  hasNextBoss?: boolean;
}
