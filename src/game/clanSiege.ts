import { COMMUNITY_DOJO_BUILDERS } from './dojoLeaderboard';
import { DOJO_PLOT_HALF_SIZE } from './dojoRules';
import type {
  ClanSiegeFormat,
  DojoBlock,
  DojoWeatherId,
  HeroClassId,
  HeroCustomization,
} from './types';

export type SiegeAiPolicy = 'duelist' | 'charger' | 'flanker' | 'ranger';

export interface ClanFighterTemplate {
  name: string;
  classId: HeroClassId;
  policy: SiegeAiPolicy;
  topColor: string;
  bottomColor: string;
  accentColor: string;
  hairStyle: HeroCustomization['hairStyle'];
  hairColor: string;
  headgear: HeroCustomization['headgear'];
  backAccessory: HeroCustomization['backAccessory'];
  weaponSkin: HeroCustomization['weaponSkin'];
  aura: HeroCustomization['aura'];
}

export interface ClanSpec {
  id: string;
  tag: string;
  name: string;
  motto: string;
  accentHex: string;
  homeDojoId: string;
  homeDojoName: string;
  homeOwnerName: string;
  signatureWeather: DojoWeatherId;
  roster: ClanFighterTemplate[];
}

export interface SiegeSpawnSlot {
  id: string;
  team: 'ally' | 'enemy';
  isPlayer: boolean;
  x: number;
  z: number;
  yaw: number;
  template?: ClanFighterTemplate;
}

export interface DojoObstacleSummary {
  trampolines: number;
  dashpads: number;
  crates: number;
  pillars: number;
  total: number;
}

export interface ClanSiegeLaunchConfig {
  format: ClanSiegeFormat;
  rivalClanId: string;
  venue: 'rival_dojo' | 'player_dojo';
  customDojoId?: string;
  customDojoName?: string;
  customOwnerName?: string;
  customBlocks?: DojoBlock[];
}

export interface ClanSiegeMatchPlan {
  format: ClanSiegeFormat;
  teamSize: 2 | 4;
  allyClanName: string;
  allyClanTag: string;
  allyAccentHex: string;
  rivalClanId: string;
  rivalClanName: string;
  rivalClanTag: string;
  rivalAccentHex: string;
  venueName: string;
  venueOwnerName: string;
  isHomeDefense: boolean;
  weather: DojoWeatherId;
  blocks: DojoBlock[];
  obstacles: DojoObstacleSummary;
  spawns: SiegeSpawnSlot[];
}

export const PLAYER_CLAN_SPEC: Pick<ClanSpec, 'id' | 'tag' | 'name' | 'motto' | 'accentHex' | 'roster'> = {
  id: 'clan-solar',
  tag: 'SUN',
  name: 'Solar Vanguard',
  motto: 'Strike fast, guard your squad.',
  accentHex: '#f59e0b',
  roster: [
    {
      name: 'KAI',
      classId: 'striker',
      policy: 'duelist',
      topColor: '#1e293b',
      bottomColor: '#0f172a',
      accentColor: '#f59e0b',
      hairStyle: 'spiky',
      hairColor: '#18181b',
      headgear: 'headband',
      backAccessory: 'scarf',
      weaponSkin: 'tonfa',
      aura: 'solar',
    },
    {
      name: 'LYRA',
      classId: 'support',
      policy: 'ranger',
      topColor: '#065f46',
      bottomColor: '#0f172a',
      accentColor: '#34d399',
      hairStyle: 'ponytail',
      hairColor: '#fef08a',
      headgear: 'visor',
      backAccessory: 'wings',
      weaponSkin: 'staff',
      aura: 'emerald',
    },
    {
      name: 'TORIN',
      classId: 'juggernaut',
      policy: 'charger',
      topColor: '#78350f',
      bottomColor: '#1e293b',
      accentColor: '#fbbf24',
      hairStyle: 'mohawk',
      hairColor: '#27272a',
      headgear: 'horns',
      backAccessory: 'thrusters',
      weaponSkin: 'gauntlets',
      aura: 'solar',
    },
  ],
};

export const RIVAL_CLANS: ClanSpec[] = [
  {
    id: 'clan-neon',
    tag: 'NEO',
    name: 'Neon Phantoms',
    motto: 'Bounce high, vanish behind the guard.',
    accentHex: '#38bdf8',
    homeDojoId: 'dojo-zara',
    homeDojoName: 'Neon Sky-Court',
    homeOwnerName: 'Zara Vance',
    signatureWeather: 'neon_night',
    roster: [
      {
        name: 'ZARA',
        classId: 'phantom',
        policy: 'flanker',
        topColor: '#0f172a',
        bottomColor: '#1e1b4b',
        accentColor: '#38bdf8',
        hairStyle: 'undercut',
        hairColor: '#38bdf8',
        headgear: 'visor',
        backAccessory: 'wings',
        weaponSkin: 'katana',
        aura: 'cyan',
      },
      {
        name: 'VOLT',
        classId: 'ranger',
        policy: 'ranger',
        topColor: '#0c4a6e',
        bottomColor: '#0f172a',
        accentColor: '#22d3ee',
        hairStyle: 'spiky',
        hairColor: '#e0f2fe',
        headgear: 'visor',
        backAccessory: 'thrusters',
        weaponSkin: 'staff',
        aura: 'cyan',
      },
      {
        name: 'NYX',
        classId: 'phantom',
        policy: 'flanker',
        topColor: '#312e81',
        bottomColor: '#0f172a',
        accentColor: '#a855f7',
        hairStyle: 'twinbuns',
        hairColor: '#c084fc',
        headgear: 'none',
        backAccessory: 'scarf',
        weaponSkin: 'katana',
        aura: 'violet',
      },
      {
        name: 'ECHO',
        classId: 'striker',
        policy: 'duelist',
        topColor: '#1e293b',
        bottomColor: '#0f172a',
        accentColor: '#38bdf8',
        hairStyle: 'locs',
        hairColor: '#0ea5e9',
        headgear: 'headband',
        backAccessory: 'none',
        weaponSkin: 'tonfa',
        aura: 'cyan',
      },
    ],
  },
  {
    id: 'clan-iron',
    tag: 'IRN',
    name: 'Iron Titans',
    motto: 'Smash through every crate and line.',
    accentHex: '#f97316',
    homeDojoId: 'dojo-jax',
    homeDojoName: 'Titan Wrecking Yard',
    homeOwnerName: 'Iron Bull Jax',
    signatureWeather: 'sunset_gloom',
    roster: [
      {
        name: 'JAX',
        classId: 'juggernaut',
        policy: 'charger',
        topColor: '#7c2d12',
        bottomColor: '#1c1917',
        accentColor: '#f97316',
        hairStyle: 'mohawk',
        hairColor: '#18181b',
        headgear: 'horns',
        backAccessory: 'thrusters',
        weaponSkin: 'gauntlets',
        aura: 'crimson',
      },
      {
        name: 'DANTE',
        classId: 'striker',
        policy: 'duelist',
        topColor: '#7f1d1d',
        bottomColor: '#18181b',
        accentColor: '#ef4444',
        hairStyle: 'spiky',
        hairColor: '#fca5a5',
        headgear: 'headband',
        backAccessory: 'scarf',
        weaponSkin: 'tonfa',
        aura: 'crimson',
      },
      {
        name: 'BRUTUS',
        classId: 'juggernaut',
        policy: 'charger',
        topColor: '#451a03',
        bottomColor: '#1c1917',
        accentColor: '#fb923c',
        hairStyle: 'undercut',
        hairColor: '#292524',
        headgear: 'horns',
        backAccessory: 'none',
        weaponSkin: 'gauntlets',
        aura: 'solar',
      },
      {
        name: 'CINDER',
        classId: 'ranger',
        policy: 'ranger',
        topColor: '#581c87',
        bottomColor: '#18181b',
        accentColor: '#f97316',
        hairStyle: 'ponytail',
        hairColor: '#fdba74',
        headgear: 'visor',
        backAccessory: 'scarf',
        weaponSkin: 'staff',
        aura: 'crimson',
      },
    ],
  },
  {
    id: 'clan-sakura',
    tag: 'SKR',
    name: 'Sakura Blades',
    motto: 'Precision parries beneath falling blossoms.',
    accentHex: '#f472b6',
    homeDojoId: 'dojo-nova',
    homeDojoName: 'Aegis Zen Pavilion',
    homeOwnerName: 'Nova Chen',
    signatureWeather: 'cherry_blossom',
    roster: [
      {
        name: 'NOVA',
        classId: 'support',
        policy: 'duelist',
        topColor: '#831843',
        bottomColor: '#1e1b4b',
        accentColor: '#f472b6',
        hairStyle: 'ponytail',
        hairColor: '#fbcfe8',
        headgear: 'headband',
        backAccessory: 'scarf',
        weaponSkin: 'staff',
        aura: 'violet',
      },
      {
        name: 'MIRA',
        classId: 'striker',
        policy: 'duelist',
        topColor: '#4c1d95',
        bottomColor: '#0f172a',
        accentColor: '#f472b6',
        hairStyle: 'twinbuns',
        hairColor: '#18181b',
        headgear: 'none',
        backAccessory: 'wings',
        weaponSkin: 'katana',
        aura: 'violet',
      },
      {
        name: 'RYUJI',
        classId: 'striker',
        policy: 'duelist',
        topColor: '#1e293b',
        bottomColor: '#0f172a',
        accentColor: '#fb7185',
        hairStyle: 'spiky',
        hairColor: '#18181b',
        headgear: 'headband',
        backAccessory: 'scarf',
        weaponSkin: 'tonfa',
        aura: 'solar',
      },
      {
        name: 'HANA',
        classId: 'phantom',
        policy: 'flanker',
        topColor: '#9d174d',
        bottomColor: '#1e293b',
        accentColor: '#fda4af',
        hairStyle: 'locs',
        hairColor: '#f9a8d4',
        headgear: 'none',
        backAccessory: 'wings',
        weaponSkin: 'katana',
        aura: 'crimson',
      },
    ],
  },
];

export function getRivalClanById(id: string): ClanSpec {
  return RIVAL_CLANS.find((c) => c.id === id) ?? RIVAL_CLANS[0];
}

export function getRivalClanForDojoId(dojoId: string): ClanSpec {
  const exact = RIVAL_CLANS.find((c) => c.homeDojoId === dojoId);
  if (exact) return exact;
  let hash = 0;
  for (let i = 0; i < dojoId.length; i++) {
    hash = (hash * 31 + dojoId.charCodeAt(i)) | 0;
  }
  return RIVAL_CLANS[Math.abs(hash) % RIVAL_CLANS.length];
}

export function summarizeDojoObstacles(blocks: DojoBlock[]): DojoObstacleSummary {
  let trampolines = 0;
  let dashpads = 0;
  let crates = 0;
  let pillars = 0;
  for (const b of blocks) {
    if (b.type === 'trampoline') trampolines++;
    else if (b.type === 'dashpad') dashpads++;
    else if (b.type === 'crate') crates++;
    else pillars++;
  }
  return {
    trampolines,
    dashpads,
    crates,
    pillars,
    total: blocks.length,
  };
}

function findSafeSpawnPosition(
  idealX: number,
  idealZ: number,
  blocks: DojoBlock[],
  taken: { x: number; z: number }[]
): { x: number; z: number } {
  const limit = DOJO_PLOT_HALF_SIZE - 2.4;
  const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));

  const isClear = (x: number, z: number): boolean => {
    for (const b of blocks) {
      if (b.type === 'trampoline' || b.type === 'dashpad') continue;
      if (Math.hypot(b.x - x, b.z - z) < 1.85) return false;
    }
    for (const t of taken) {
      if (Math.hypot(t.x - x, t.z - z) < 1.9) return false;
    }
    return true;
  };

  const sx = clamp(idealX);
  const sz = clamp(idealZ);
  if (isClear(sx, sz)) return { x: sx, z: sz };

  // Spiral search around the ideal slot
  for (let radius = 1.6; radius <= 8.0; radius += 1.4) {
    for (let step = 0; step < 12; step++) {
      const a = (step / 12) * Math.PI * 2;
      const cx = clamp(sx + Math.cos(a) * radius);
      const cz = clamp(sz + Math.sin(a) * radius);
      if (isClear(cx, cz)) return { x: cx, z: cz };
    }
  }
  return { x: sx, z: sz };
}

export function buildClanSiegeMatchPlan(
  config: ClanSiegeLaunchConfig,
  playerBlocks: DojoBlock[],
  playerDojoName: string,
  playerOwnerName: string,
  playerWeather: DojoWeatherId
): ClanSiegeMatchPlan {
  const teamSize: 2 | 4 = config.format === '4v4' ? 4 : 2;
  const rivalClan = getRivalClanById(config.rivalClanId);
  const isHomeDefense = config.venue === 'player_dojo';

  let blocks: DojoBlock[];
  let venueName: string;
  let venueOwnerName: string;
  let weather: DojoWeatherId;

  if (isHomeDefense) {
    blocks = playerBlocks.map((b) => ({ ...b }));
    venueName = playerDojoName || 'My Dojo Plot';
    venueOwnerName = playerOwnerName || 'KAIRO';
    weather = playerWeather;
  } else if (config.customBlocks && config.customBlocks.length > 0) {
    blocks = config.customBlocks.map((b) => ({ ...b }));
    venueName = config.customDojoName || rivalClan.homeDojoName;
    venueOwnerName = config.customOwnerName || rivalClan.homeOwnerName;
    weather = rivalClan.signatureWeather;
  } else {
    const builder = COMMUNITY_DOJO_BUILDERS.find((d) => d.id === rivalClan.homeDojoId);
    blocks = (builder?.blocks ?? playerBlocks).map((b) => ({ ...b }));
    venueName = builder?.dojoName ?? rivalClan.homeDojoName;
    venueOwnerName = builder?.ownerName ?? rivalClan.homeOwnerName;
    weather = rivalClan.signatureWeather;
  }

  const xSpread = teamSize === 4 ? [-6.0, -2.0, 2.0, 6.0] : [-2.6, 2.6];
  const allyZ = 8.4;
  const enemyZ = -8.4;
  const taken: { x: number; z: number }[] = [];
  const spawns: SiegeSpawnSlot[] = [];

  // Team Ally: Player + (teamSize - 1) Solar Vanguard teammates
  for (let i = 0; i < teamSize; i++) {
    const pos = findSafeSpawnPosition(xSpread[i], allyZ, blocks, taken);
    taken.push(pos);
    if (i === 0) {
      spawns.push({
        id: 'player',
        team: 'ally',
        isPlayer: true,
        x: pos.x,
        z: pos.z,
        yaw: Math.PI,
      });
    } else {
      const tpl = PLAYER_CLAN_SPEC.roster[(i - 1) % PLAYER_CLAN_SPEC.roster.length];
      spawns.push({
        id: `siege-ally-${i}`,
        team: 'ally',
        isPlayer: false,
        x: pos.x,
        z: pos.z,
        yaw: Math.PI,
        template: tpl,
      });
    }
  }

  // Team Enemy: Rival Clan squad
  for (let i = 0; i < teamSize; i++) {
    const pos = findSafeSpawnPosition(xSpread[i], enemyZ, blocks, taken);
    taken.push(pos);
    const tpl = rivalClan.roster[i % rivalClan.roster.length];
    spawns.push({
      id: `siege-enemy-${i}`,
      team: 'enemy',
      isPlayer: false,
      x: pos.x,
      z: pos.z,
      yaw: 0,
      template: tpl,
    });
  }

  return {
    format: config.format,
    teamSize,
    allyClanName: PLAYER_CLAN_SPEC.name,
    allyClanTag: PLAYER_CLAN_SPEC.tag,
    allyAccentHex: PLAYER_CLAN_SPEC.accentHex,
    rivalClanId: rivalClan.id,
    rivalClanName: rivalClan.name,
    rivalClanTag: rivalClan.tag,
    rivalAccentHex: rivalClan.accentHex,
    venueName,
    venueOwnerName,
    isHomeDefense,
    weather,
    blocks,
    obstacles: summarizeDojoObstacles(blocks),
    spawns,
  };
}

export function evaluateClanSiegeOutcome(params: {
  allyAlive: number;
  enemyAlive: number;
  playerKo: boolean;
  format: ClanSiegeFormat;
}): {
  finished: boolean;
  victory: boolean;
  coinsEarned: number;
  xpEarned: number;
} {
  if (params.enemyAlive <= 0) {
    const isLarge = params.format === '4v4';
    return {
      finished: true,
      victory: true,
      coinsEarned: isLarge ? 260 : 190,
      xpEarned: isLarge ? 185 : 135,
    };
  }
  if (params.allyAlive <= 0 || params.playerKo) {
    return {
      finished: true,
      victory: false,
      coinsEarned: 65,
      xpEarned: 60,
    };
  }
  return {
    finished: false,
    victory: false,
    coinsEarned: 0,
    xpEarned: 0,
  };
}
