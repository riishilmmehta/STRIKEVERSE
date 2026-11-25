import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STORE_STATE,
  DOJO_TRADE_OFFERS,
  STORE_ITEMS,
  STORE_TIER_ORDER,
  executeDojoTrade,
  purchaseStoreItem,
} from './storeCatalog';
import type { DojoBlock } from './types';

test('Store covers all 5 tiers (Basic, Costly, Expensive, Very Expensive, VIP) with new emotes', () => {
  assert.deepEqual(STORE_TIER_ORDER, [
    'basic',
    'costly',
    'expensive',
    'very_expensive',
    'vip',
  ]);
  for (const tier of STORE_TIER_ORDER) {
    const itemsInTier = STORE_ITEMS.filter((i) => i.tier === tier);
    assert.ok(itemsInTier.length >= 2, `Expected at least 2 items in tier ${tier}`);
    assert.ok(
      itemsInTier.some((i) => i.kind === 'emote'),
      `Expected an emote in tier ${tier}`
    );
  }
});

test('purchaseStoreItem deducts coins, unlocks emote, and rejects insufficient funds or duplicates', () => {
  const denied = purchaseStoreItem(DEFAULT_STORE_STATE, 'emote-backflip', 50);
  assert.equal(denied.purchased, false);
  assert.equal(denied.remainingCoins, 50);

  const bought = purchaseStoreItem(DEFAULT_STORE_STATE, 'emote-backflip', 300);
  assert.equal(bought.purchased, true);
  assert.equal(bought.remainingCoins, 190);
  assert.ok(bought.state.ownedItemIds.includes('emote-backflip'));
  assert.ok(bought.state.ownedEmotes.includes('backflip'));

  const duplicate = purchaseStoreItem(bought.state, 'emote-backflip', 190);
  assert.equal(duplicate.purchased, false);
  assert.equal(duplicate.remainingCoins, 190);
});

test('executeDojoTrade swaps matching Dojo block in-place and awards bonus coins', () => {
  const initialBlocks: DojoBlock[] = [
    { id: 'crate-1', type: 'crate', x: 2, z: -3, rotation: 0 },
    { id: 'lantern-1', type: 'lantern', x: -4, z: 2, rotation: 0 },
  ];

  const soraOffer = DOJO_TRADE_OFFERS[0]; // trades crate -> trampoline + 35c
  const result = executeDojoTrade(DEFAULT_STORE_STATE, soraOffer.id, initialBlocks);
  assert.equal(result.traded, true);
  assert.equal(result.bonusCoins, soraOffer.bonusCoins);
  assert.equal(result.state.tradeCount, 1);
  assert.ok(result.state.completedTradeIds.includes(soraOffer.id));
  assert.equal(result.blocks[0].type, 'trampoline');
  assert.equal(result.blocks[0].x, 2);
  assert.equal(result.blocks[0].z, -3);

  // Attempting the same trade again without another crate should cleanly reject
  const missingBlock = executeDojoTrade(result.state, soraOffer.id, result.blocks);
  assert.equal(missingBlock.traded, false);
  assert.equal(missingBlock.bonusCoins, 0);
});
