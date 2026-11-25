export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type WorldZone = 'hub' | 'arena' | 'campaign' | 'dojo' | 'royale' | 'clan_siege';

export type DojoWeatherId = 'clear_day' | 'cherry_blossom' | 'sunset_gloom' | 'neon_night';

export type DojoAudioTrackId = 'zen_garden' | 'heavy_beat' | 'stormy_dojo' | 'cyber_pulse' | 'silent';

export type ArenaBiomeId =
  | 'salt_flats'
  | 'karst_cenotes'
  | 'wildfire_ashlands'
  | 'geothermal_springs'
  | 'kelp_brine';

export type StoreTierId = 'basic' | 'costly' | 'expensive' | 'very_expensive' | 'vip';

export type ClanSiegeFormat = '2v2' | '4v4';

export type ClanEmblemShapeId = 'shield' | 'diamond' | 'hex' | 'circle' | 'pennant' | 'crest';

export type ClanEmblemPatternId = 'solid' | 'split' | 'chevron' | 'stripe' | 'rays';

export type ClanEmblemIconId =
  | 'katana'
  | 'lightning'
  | 'lotus'
  | 'fist'
  | 'crown'
  | 'shuriken'
  | 'dragon_claw'
  | 'sunburst';

export interface ClanEmblemConfig {
  shape: ClanEmblemShapeId;
  pattern: ClanEmblemPatternId;
  icon: ClanEmblemIconId;
  primaryColor: string;
  secondaryColor: string;
  iconColor: string;
}

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

export type EmoteId =
  | 'flex'
  | 'shadowbox'
  | 'bow'
  | 'dance'
  | 'backflip'
  | 'meditate'
  | 'lightning_pose'
  | 'dragon_roar'
  | 'throne_salute'
  | 'rank_uncharted_flex'
  | 'rank_wilds_prowl'
  | 'rank_frontier_salute'
  | 'rank_mythic_ascension'
  | 'rank_cosmic_meditation';

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

export type DummyVariantId = 'static' | 'kaito_duelist' | 'iron_charger' | 'vex_flanker';

export interface DojoBlock {
  id: string;
  type: DojoBlockType;
  x: number;
  z: number;
  rotation: number;
  dummyVariant?: DummyVariantId;
}

export interface CombatLogEntry {
  id: number;
  sequence: string;
  tokens: string[];
  moveName: string;
  hits: number;
  totalDamage: number;
  isFinisher: boolean;
  targetName: string;
  rank: 'C' | 'B' | 'A' | 'S' | 'S+';
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

export interface NearbyHubFighter {
  id: string;
  name: string;
  title: string;
  arenaRank: number;
  rankName: string;
  classId: HeroClassId;
  accentHex: string;
}

export interface HubMinimapBlip {
  id: string;
  label: string;
  x: number;
  z: number;
  kind: 'npc' | 'portal';
  colorHex: string;
}

export interface HubMinimapState {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  worldRadius: number;
  blips: HubMinimapBlip[];
}

export interface MatchRoundState {
  roundNumber: number;
  playerRounds: number;
  opponentRounds: number;
  roundsToWin: number;
  maxRounds: number;
  bannerText: string | null;
}

export interface ReplayHighlightClip {
  id: number;
  timestampSec: number;
  kind: 'parry' | 'combo' | 'finisher' | 'ko' | 'ultimate';
  title: string;
  detail: string;
  damage: number;
  impactScore: number;
  accentHex: string;
}

export interface MatchItemDrop {
  id: string;
  name: string;
  rarity: 'Rare' | 'Epic' | 'Legendary';
  accentHex: string;
  description: string;
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

export interface ClanSiegeHudState {
  format: ClanSiegeFormat;
  allyClanName: string;
  allyClanTag: string;
  allyAccentHex: string;
  allyAlive: number;
  allyTotal: number;
  rivalClanName: string;
  rivalClanTag: string;
  rivalAccentHex: string;
  enemyAlive: number;
  enemyTotal: number;
  venueName: string;
  venueOwnerName: string;
  isHomeDefense: boolean;
  weather: DojoWeatherId;
  obstacleSummary: string;
}

export interface ComboMilestoneFlash {
  id: number;
  threshold: number;
  title: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
  opacity: number;
}

export interface ArenaRankHudState {
  rank: number;
  rankName: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  accentHex: string;
  winsInRank: number;
  winsRequired: number;
  totalArenaWins: number;
  selectedBiome: ArenaBiomeId;
  biomeName: string;
  biomeHazardNote: string;
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
  nearbyHubFighter: NearbyHubFighter | null;
  hubMinimap: HubMinimapState | null;
  arenaRounds: MatchRoundState | null;
  roundBanner: string | null;
  parryCounterReady: boolean;
  matchFinishOverlay: 'victory' | 'defeat' | null;
  callout: CombatCallout | null;
  damagePopups: FloatingDamageNumber[];
  combatLog: CombatLogEntry[];
  combatArchive: CombatLogEntry[];
  milestoneFlash: ComboMilestoneFlash | null;
  emoteSpotlightName: string | null;
  dojoMode: 'play' | 'build';
  selectedDojoBlock: DojoBlockType;
  selectedDummyVariant: DummyVariantId;
  dojoBlockCount: number;
  activeDummyCount: number;
  dojoWeather: DojoWeatherId;
  dojoWeatherCycle: boolean;
  unlockedDojoWeathers: DojoWeatherId[];
  dojoAudioTrack: DojoAudioTrackId;
  activeAudioTrack: DojoAudioTrackId | null;
  visitingDojo: VisitedDojoSummary | null;
  clanSiege: ClanSiegeHudState | null;
  spectatorActive: boolean;
  spectatorEventLabel: string | null;
  arenaRank: ArenaRankHudState;
  ownedEmotes: EmoteId[];
  hubBotCount: number;
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

export interface MatchArenaProgress {
  rankBefore: number;
  rankAfter: number;
  rankNameAfter: string;
  tierAfter: 1 | 2 | 3 | 4 | 5;
  tierNameAfter: string;
  accentHex: string;
  winsInRank: number;
  winsRequired: number;
  rankedUp: boolean;
  tierChanged: boolean;
  unlockedEmoteName?: string;
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
  levelBefore?: number;
  levelAfter?: number;
  xpAfter?: number;
  xpToNext?: number;
  leveledUp?: boolean;
  arenaProgress?: MatchArenaProgress;
  roundScore?: { playerRounds: number; opponentRounds: number; maxRounds?: number };
  voiceLine?: {
    classId: HeroClassId;
    personaLabel: string;
    line: string;
    accentHex: string;
  };
  itemDrop?: MatchItemDrop;
  replayHighlights?: ReplayHighlightClip[];
  bossIndex?: number;
  hasNextBoss?: boolean;
}
