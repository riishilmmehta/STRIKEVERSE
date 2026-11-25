import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DOJO_WEATHER_STATE,
  DOJO_WEATHER_ORDER,
  DOJO_WEATHER_SPECS,
  getWeatherUnlockStatus,
  isWeatherEarnedByProgress,
  isWeatherUnlocked,
  purchaseDojoWeather,
  selectDojoWeather,
  type WeatherProgressSnapshot,
} from './dojoWeather';

const FRESH_PROGRESS: WeatherProgressSnapshot = {
  wins: 0,
  highestBossCleared: -1,
  dojoBlockCount: 8,
};

describe('dojoWeather catalog & unlock rules', () => {
  it('defines all four weather presets with valid lighting and particle configs', () => {
    assert.deepEqual(DOJO_WEATHER_ORDER, [
      'clear_day',
      'cherry_blossom',
      'sunset_gloom',
      'neon_night',
    ]);
    for (const id of DOJO_WEATHER_ORDER) {
      const spec = DOJO_WEATHER_SPECS[id];
      assert.equal(spec.id, id);
      assert.ok(spec.name.length > 0);
      assert.ok(spec.shortLabel.length > 0);
      assert.ok(spec.sunIntensity > 0);
      if (id === 'clear_day') {
        assert.equal(spec.particleMode, 'none');
        assert.equal(spec.costCoins, 0);
      } else {
        assert.notEqual(spec.particleMode, 'none');
        assert.ok(spec.particleCount > 0);
        assert.ok(spec.costCoins > 0);
      }
    }
  });

  it('starts with only clear_day unlocked for a fresh player', () => {
    assert.equal(isWeatherUnlocked('clear_day', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS), true);
    assert.equal(
      isWeatherUnlocked('cherry_blossom', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS),
      false
    );
    assert.equal(
      isWeatherUnlocked('sunset_gloom', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS),
      false
    );
    assert.equal(
      isWeatherUnlocked('neon_night', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS),
      false
    );
    assert.equal(
      getWeatherUnlockStatus('clear_day', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS).source,
      'default'
    );
    assert.equal(
      getWeatherUnlockStatus('cherry_blossom', DEFAULT_DOJO_WEATHER_STATE, FRESH_PROGRESS).source,
      'locked'
    );
  });

  it('earns weathers for free via gameplay milestones', () => {
    assert.equal(isWeatherEarnedByProgress('cherry_blossom', { ...FRESH_PROGRESS, wins: 1 }), true);
    assert.equal(isWeatherEarnedByProgress('sunset_gloom', { ...FRESH_PROGRESS, wins: 2 }), false);
    assert.equal(isWeatherEarnedByProgress('sunset_gloom', { ...FRESH_PROGRESS, wins: 3 }), true);
    assert.equal(
      isWeatherEarnedByProgress('neon_night', { ...FRESH_PROGRESS, dojoBlockCount: 10 }),
      true
    );
    assert.equal(
      isWeatherEarnedByProgress('neon_night', { ...FRESH_PROGRESS, highestBossCleared: 1 }),
      true
    );

    const status = getWeatherUnlockStatus('neon_night', DEFAULT_DOJO_WEATHER_STATE, {
      ...FRESH_PROGRESS,
      dojoBlockCount: 10,
    });
    assert.deepEqual(status, { unlocked: true, source: 'earned' });
  });

  it('purchases locked weather with coins, activates it, and blocks duplicate or underfunded purchases', () => {
    const firstBuy = purchaseDojoWeather(
      DEFAULT_DOJO_WEATHER_STATE,
      'cherry_blossom',
      350,
      FRESH_PROGRESS
    );
    assert.equal(firstBuy.purchased, true);
    assert.equal(firstBuy.remainingCoins, 200);
    assert.equal(firstBuy.state.activeWeather, 'cherry_blossom');
    assert.ok(firstBuy.state.unlockedIds.includes('cherry_blossom'));
    assert.equal(
      getWeatherUnlockStatus('cherry_blossom', firstBuy.state, FRESH_PROGRESS).source,
      'purchased'
    );

    // Duplicate purchase should not charge again
    const dupBuy = purchaseDojoWeather(firstBuy.state, 'cherry_blossom', 200, FRESH_PROGRESS);
    assert.equal(dupBuy.purchased, false);
    assert.equal(dupBuy.remainingCoins, 200);
    assert.equal(dupBuy.state.activeWeather, 'cherry_blossom');

    // Insufficient coins for neon_night (300c) with 200c
    const poorBuy = purchaseDojoWeather(firstBuy.state, 'neon_night', 200, FRESH_PROGRESS);
    assert.equal(poorBuy.purchased, false);
    assert.equal(poorBuy.remainingCoins, 200);
    assert.equal(poorBuy.state.activeWeather, 'cherry_blossom');
    assert.match(poorBuy.reason ?? '', /100 more coins/);
  });

  it('selects unlocked or earned weather and rejects locked weather', () => {
    const blocked = selectDojoWeather(DEFAULT_DOJO_WEATHER_STATE, 'sunset_gloom', FRESH_PROGRESS);
    assert.equal(blocked.selected, false);
    assert.equal(blocked.state.activeWeather, 'clear_day');

    const earnedSelect = selectDojoWeather(DEFAULT_DOJO_WEATHER_STATE, 'neon_night', {
      ...FRESH_PROGRESS,
      dojoBlockCount: 10,
    });
    assert.equal(earnedSelect.selected, true);
    assert.equal(earnedSelect.state.activeWeather, 'neon_night');
  });
});
