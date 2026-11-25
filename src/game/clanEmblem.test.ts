import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAN_EMBLEM_COLORS,
  CLAN_EMBLEM_ICONS,
  CLAN_EMBLEM_PATTERNS,
  CLAN_EMBLEM_SHAPES,
  DEFAULT_CLAN_EMBLEM,
  formatClanEmblemSummary,
  randomizeClanEmblem,
  validateClanEmblem,
} from './clanEmblem';

describe('clanEmblem designer logic', () => {
  it('exposes rich catalogs of pre-made shapes, patterns, icons, and colors', () => {
    assert.ok(CLAN_EMBLEM_SHAPES.length >= 6);
    assert.ok(CLAN_EMBLEM_PATTERNS.length >= 5);
    assert.ok(CLAN_EMBLEM_ICONS.length >= 8);
    assert.ok(CLAN_EMBLEM_COLORS.length >= 8);
  });

  it('validates and sanitizes malformed or partial saved emblem configs cleanly', () => {
    assert.deepEqual(validateClanEmblem(null), DEFAULT_CLAN_EMBLEM);
    assert.deepEqual(validateClanEmblem({}), DEFAULT_CLAN_EMBLEM);

    const sanitized = validateClanEmblem({
      shape: 'diamond',
      pattern: 'rays',
      icon: 'dragon_claw',
      primaryColor: '#ef4444',
      secondaryColor: 'not-a-hex' as string,
      iconColor: '#f8fafc',
    });
    assert.equal(sanitized.shape, 'diamond');
    assert.equal(sanitized.pattern, 'rays');
    assert.equal(sanitized.icon, 'dragon_claw');
    assert.equal(sanitized.primaryColor, '#ef4444');
    assert.equal(sanitized.secondaryColor, DEFAULT_CLAN_EMBLEM.secondaryColor);
    assert.equal(sanitized.iconColor, '#f8fafc');
  });

  it('randomizes valid contrasting emblems deterministically for a given seed', () => {
    const a = randomizeClanEmblem(42);
    const b = randomizeClanEmblem(42);
    const c = randomizeClanEmblem(99);
    assert.deepEqual(a, b);
    assert.notEqual(a.primaryColor, a.secondaryColor);
    assert.notEqual(a.primaryColor, a.iconColor);
    assert.deepEqual(validateClanEmblem(c), c);
  });

  it('formats human-readable banner summary labels', () => {
    const summary = formatClanEmblemSummary({
      ...DEFAULT_CLAN_EMBLEM,
      shape: 'crest',
      pattern: 'chevron',
      icon: 'katana',
    });
    assert.equal(summary, 'Winged Crest · Chevron · Twin Blades');
  });
});
