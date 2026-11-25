import type {
  BackAccessoryId,
  EmoteId,
  HairStyleId,
  HeadgearId,
  HeroClassId,
  PetTypeId,
  WeaponSkinId,
} from './types';

export interface HubNpcSpec {
  id: string;
  name: string;
  title: string;
  arenaRank: number; // 1..50 displayed visibly above bot in Nexus City
  classId: HeroClassId;
  x: number;
  z: number;
  topColor: string;
  bottomColor: string;
  accentColor: string;
  hairStyle: HairStyleId;
  hairColor: string;
  headgear: HeadgearId;
  backAccessory: BackAccessoryId;
  weaponSkin: WeaponSkinId;
  pet: PetTypeId;
  initialEmote: EmoteId | null;
}

/**
 * 8 lively Nexus City social citizens (4 original + 4 newly added bots)
 * distributed around the plaza, portals, and Martial Spire with visible 1v1 Arena Ranks.
 */
export const HUB_CITY_NPCS: HubNpcSpec[] = [
  {
    id: 'hub-npc-0',
    name: 'SORA',
    title: 'Nexus Citizen',
    arenaRank: 16, // Tier 2: Ranger
    classId: 'striker',
    x: -7.5,
    z: 3.5,
    topColor: '#0284c7',
    bottomColor: '#0f172a',
    accentColor: '#38bdf8',
    hairStyle: 'ponytail',
    hairColor: '#18181b',
    headgear: 'visor',
    backAccessory: 'scarf',
    weaponSkin: 'tonfa',
    pet: 'fox',
    initialEmote: 'shadowbox',
  },
  {
    id: 'hub-npc-1',
    name: 'JAX',
    title: 'Nexus Citizen',
    arenaRank: 28, // Tier 3: Colossus
    classId: 'juggernaut',
    x: 7.5,
    z: 2.5,
    topColor: '#be123c',
    bottomColor: '#18181b',
    accentColor: '#fb7185',
    hairStyle: 'locs',
    hairColor: '#27272a',
    headgear: 'headband',
    backAccessory: 'wings',
    weaponSkin: 'gauntlets',
    pet: 'none',
    initialEmote: 'flex',
  },
  {
    id: 'hub-npc-2',
    name: 'MIKO',
    title: 'Nexus Citizen',
    arenaRank: 33, // Tier 4: Oracle
    classId: 'support',
    x: -5.5,
    z: -9.0,
    topColor: '#047857',
    bottomColor: '#0f172a',
    accentColor: '#34d399',
    hairStyle: 'twinbuns',
    hairColor: '#18181b',
    headgear: 'visor',
    backAccessory: 'scarf',
    weaponSkin: 'staff',
    pet: 'none',
    initialEmote: 'dance',
  },
  {
    id: 'hub-npc-3',
    name: 'ZANE',
    title: 'Nexus Citizen',
    arenaRank: 49, // Tier 5: Apex
    classId: 'phantom',
    x: 6.5,
    z: -8.5,
    topColor: '#4338ca',
    bottomColor: '#0f172a',
    accentColor: '#a855f7',
    hairStyle: 'undercut',
    hairColor: '#e2e8f0',
    headgear: 'headband',
    backAccessory: 'wings',
    weaponSkin: 'katana',
    pet: 'none',
    initialEmote: null,
  },
  // 4 Newly Added Nexus City Bots
  {
    id: 'hub-npc-4',
    name: 'REN',
    title: 'Dojo Scout',
    arenaRank: 8, // Tier 1: Wayfinder
    classId: 'striker',
    x: -13.2,
    z: -2.2,
    topColor: '#b45309',
    bottomColor: '#1e293b',
    accentColor: '#fbbf24',
    hairStyle: 'spiky',
    hairColor: '#18181b',
    headgear: 'headband',
    backAccessory: 'scarf',
    weaponSkin: 'katana',
    pet: 'drone',
    initialEmote: 'bow',
  },
  {
    id: 'hub-npc-5',
    name: 'KIRA',
    title: 'Style Runner',
    arenaRank: 45, // Tier 5: Eclipse
    classId: 'phantom',
    x: -8.8,
    z: 10.6,
    topColor: '#7e22ce',
    bottomColor: '#0f172a',
    accentColor: '#e879f9',
    hairStyle: 'ponytail',
    hairColor: '#f472b6',
    headgear: 'visor',
    backAccessory: 'thrusters',
    weaponSkin: 'tonfa',
    pet: 'orb',
    initialEmote: 'dance',
  },
  {
    id: 'hub-npc-6',
    name: 'BLAZE',
    title: 'Arena Duelist',
    arenaRank: 39, // Tier 4: Emperor
    classId: 'ranger',
    x: 11.4,
    z: -3.2,
    topColor: '#c2410c',
    bottomColor: '#1c1917',
    accentColor: '#fb923c',
    hairStyle: 'mohawk',
    hairColor: '#f97316',
    headgear: 'horns',
    backAccessory: 'thrusters',
    weaponSkin: 'staff',
    pet: 'none',
    initialEmote: 'shadowbox',
  },
  {
    id: 'hub-npc-7',
    name: 'YUKI',
    title: 'Clan Herald',
    arenaRank: 50, // Tier 5: Omni
    classId: 'support',
    x: 5.2,
    z: 11.4,
    topColor: '#0f766e',
    bottomColor: '#0f172a',
    accentColor: '#2dd4bf',
    hairStyle: 'twinbuns',
    hairColor: '#f8fafc',
    headgear: 'none',
    backAccessory: 'wings',
    weaponSkin: 'staff',
    pet: 'fox',
    initialEmote: null,
  },
];
