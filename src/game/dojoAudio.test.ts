import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DOJO_AUDIO_TRACK,
  DOJO_AUDIO_ORDER,
  DOJO_AUDIO_SPECS,
  getCommunityDojoTrack,
  isValidDojoAudioTrack,
  normalizeDojoAudioTrack,
} from './dojoAudio';

describe('dojoAudio track catalog & guest routing', () => {
  it('defines Zen Garden, Heavy Beat, Stormy Dojo, Cyber Pulse, and Quiet tracks with valid step timings', () => {
    assert.deepEqual(DOJO_AUDIO_ORDER, [
      'zen_garden',
      'heavy_beat',
      'stormy_dojo',
      'cyber_pulse',
      'silent',
    ]);
    for (const id of DOJO_AUDIO_ORDER) {
      const spec = DOJO_AUDIO_SPECS[id];
      assert.equal(spec.id, id);
      assert.ok(spec.name.length > 0);
      assert.ok(spec.genreTag.length > 0);
      assert.ok(spec.stepMs >= 200 && spec.stepMs <= 600);
    }
    assert.equal(DOJO_AUDIO_SPECS.zen_garden.name, 'Zen Garden');
    assert.equal(DOJO_AUDIO_SPECS.heavy_beat.genreTag, 'Lo-Fi');
    assert.equal(DOJO_AUDIO_SPECS.stormy_dojo.name, 'Stormy Dojo');
  });

  it('validates and normalizes stored track ids safely', () => {
    assert.equal(isValidDojoAudioTrack('heavy_beat'), true);
    assert.equal(isValidDojoAudioTrack('stormy_dojo'), true);
    assert.equal(isValidDojoAudioTrack('invalid_track'), false);
    assert.equal(normalizeDojoAudioTrack('stormy_dojo'), 'stormy_dojo');
    assert.equal(normalizeDojoAudioTrack(null), DEFAULT_DOJO_AUDIO_TRACK);
    assert.equal(normalizeDojoAudioTrack('unknown'), DEFAULT_DOJO_AUDIO_TRACK);
  });

  it('deterministically assigns guest tracks to community Dojos', () => {
    assert.equal(getCommunityDojoTrack('dojo-zara'), 'cyber_pulse');
    assert.equal(getCommunityDojoTrack('dojo-nova'), 'zen_garden');
    assert.equal(getCommunityDojoTrack('dojo-jax'), 'heavy_beat');
    const customTrack = getCommunityDojoTrack('dojo-visitor-77');
    assert.equal(isValidDojoAudioTrack(customTrack), true);
    assert.notEqual(customTrack, 'silent');
  });
});
