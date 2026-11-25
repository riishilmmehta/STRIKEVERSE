import type { HeroClassId } from './types';

export type VoiceOutcome = 'victory' | 'defeat';

export interface CharacterVoiceProfile {
  classId: HeroClassId;
  personaLabel: string;
  pitch: number;
  rate: number;
  /** Primary vocal formant frequency (Hz) for Web Audio synthetic voice timbre */
  formant1Hz: number;
  /** Secondary vocal formant frequency (Hz) */
  formant2Hz: number;
  /** Base fundamental frequency (Hz) */
  baseFreqHz: number;
  accentHex: string;
  victoryLines: string[];
  defeatLines: string[];
}

export interface SelectedVoiceLine {
  classId: HeroClassId;
  outcome: VoiceOutcome;
  personaLabel: string;
  line: string;
  pitch: number;
  rate: number;
  formant1Hz: number;
  formant2Hz: number;
  baseFreqHz: number;
  accentHex: string;
}

export const CHARACTER_VOICE_PROFILES: Record<HeroClassId, CharacterVoiceProfile> = {
  striker: {
    classId: 'striker',
    personaLabel: 'Solar Striker',
    pitch: 1.08,
    rate: 1.06,
    formant1Hz: 680,
    formant2Hz: 1850,
    baseFreqHz: 210,
    accentHex: '#f59e0b',
    victoryLines: [
      'Too slow! That Red Flame never dies!',
      'Every chain landed clean. Who is next?',
      'Blazing speed beats raw force every single time!',
    ],
    defeatLines: [
      'My guard slipped... next match is mine!',
      'Tch, you read my opener. Run it back!',
      'Not done yet. The embers are still burning.',
    ],
  },
  juggernaut: {
    classId: 'juggernaut',
    personaLabel: 'Iron Juggernaut',
    pitch: 0.78,
    rate: 0.92,
    formant1Hz: 440,
    formant2Hz: 1120,
    baseFreqHz: 118,
    accentHex: '#ef4444',
    victoryLines: [
      'Unbreakable! Bring a stronger wall next time!',
      'Ground shattered. Match decided.',
      'Stand against the titan and feel the quake!',
    ],
    defeatLines: [
      'Even iron bends... I will forge back harder.',
      'Heavy hit. Respect—now let us go again.',
      'You broke my stance. That will not happen twice.',
    ],
  },
  phantom: {
    classId: 'phantom',
    personaLabel: 'Eclipse Phantom',
    pitch: 1.18,
    rate: 1.02,
    formant1Hz: 560,
    formant2Hz: 2150,
    baseFreqHz: 245,
    accentHex: '#f97316',
    victoryLines: [
      'You struck a shadow. Match over.',
      'Silent step, decisive finish.',
      'Blink once and the duel is already won.',
    ],
    defeatLines: [
      'Vanished too soon... I misread your tempo.',
      'Sharp eyes. Next time you will not see me coming.',
      'Into the smoke. I will return sharper.',
    ],
  },
  ranger: {
    classId: 'ranger',
    personaLabel: 'Horizon Ranger',
    pitch: 1.02,
    rate: 1.04,
    formant1Hz: 610,
    formant2Hz: 1680,
    baseFreqHz: 188,
    accentHex: '#facc15',
    victoryLines: [
      'Locked on target. Clean sweep!',
      'Distance controlled, duel secured.',
      'Read your footwork from across the ring!',
    ],
    defeatLines: [
      'Closed the gap too fast... recalibrating my stance.',
      'Out of range. Next bout I hold the line.',
      'Good pressure. My sights will be steadier next match.',
    ],
  },
  support: {
    classId: 'support',
    personaLabel: 'Aegis Mystic',
    pitch: 1.12,
    rate: 0.97,
    formant1Hz: 520,
    formant2Hz: 1520,
    baseFreqHz: 224,
    accentHex: '#fbbf24',
    victoryLines: [
      'Harmony prevails! Every strike in balance.',
      'Patience, rhythm, and a flawless counter.',
      'Your momentum became my victory.',
    ],
    defeatLines: [
      'The rhythm broke... time to breathe and recenter.',
      'Overwhelmed my ward. Well fought.',
      'Defeat teaches what victory hides. Again!',
    ],
  },
};

export function selectCharacterVoiceLine(
  classId: HeroClassId,
  outcome: VoiceOutcome,
  seed = 0
): SelectedVoiceLine {
  const profile = CHARACTER_VOICE_PROFILES[classId] ?? CHARACTER_VOICE_PROFILES.striker;
  const pool = outcome === 'victory' ? profile.victoryLines : profile.defeatLines;
  const safeIdx = Math.abs(Math.floor(seed)) % pool.length;
  return {
    classId: profile.classId,
    outcome,
    personaLabel: profile.personaLabel,
    line: pool[safeIdx],
    pitch: profile.pitch,
    rate: profile.rate,
    formant1Hz: profile.formant1Hz,
    formant2Hz: profile.formant2Hz,
    baseFreqHz: profile.baseFreqHz,
    accentHex: profile.accentHex,
  };
}
