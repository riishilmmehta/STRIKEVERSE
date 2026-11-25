import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_VOICE_PROFILES,
  selectCharacterVoiceLine,
} from './characterVoices';
import type { HeroClassId } from './types';

const ALL_CLASSES: HeroClassId[] = ['striker', 'juggernaut', 'phantom', 'ranger', 'support'];

test('all 5 Hero Classes define distinct Victory and Defeat voice lines and vocal pitches', () => {
  const seenVictory = new Set<string>();
  const seenDefeat = new Set<string>();

  for (const cls of ALL_CLASSES) {
    const profile = CHARACTER_VOICE_PROFILES[cls];
    assert.ok(profile, `Missing profile for ${cls}`);
    assert.ok(profile.victoryLines.length >= 3, `${cls} needs at least 3 victory lines`);
    assert.ok(profile.defeatLines.length >= 3, `${cls} needs at least 3 defeat lines`);
    assert.ok(profile.pitch >= 0.7 && profile.pitch <= 1.3);
    assert.ok(profile.rate >= 0.85 && profile.rate <= 1.15);

    for (const line of profile.victoryLines) {
      assert.ok(line.trim().length > 8);
      assert.equal(seenVictory.has(line), false, `Duplicate victory line: ${line}`);
      seenVictory.add(line);
    }
    for (const line of profile.defeatLines) {
      assert.ok(line.trim().length > 8);
      assert.equal(seenDefeat.has(line), false, `Duplicate defeat line: ${line}`);
      seenDefeat.add(line);
    }
  }
});

test('selectCharacterVoiceLine returns deterministic class-specific victory and defeat lines', () => {
  const juggWin = selectCharacterVoiceLine('juggernaut', 'victory', 0);
  const phantomLoss = selectCharacterVoiceLine('phantom', 'defeat', 1);

  assert.equal(juggWin.classId, 'juggernaut');
  assert.equal(juggWin.outcome, 'victory');
  assert.ok(juggWin.pitch < phantomLoss.pitch, 'Juggernaut voice should be deeper than Phantom');
  assert.equal(juggWin.line, CHARACTER_VOICE_PROFILES.juggernaut.victoryLines[0]);
  assert.equal(phantomLoss.line, CHARACTER_VOICE_PROFILES.phantom.defeatLines[1]);

  // Negative seeds wrap cleanly without throwing
  const wrapped = selectCharacterVoiceLine('striker', 'victory', -2);
  assert.ok(CHARACTER_VOICE_PROFILES.striker.victoryLines.includes(wrapped.line));
});
