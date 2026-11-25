import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSpectatorCameraPose } from './spectatorCamera';

test('Cinematic Spectator camera pulls closer and narrows FOV during parries and combo finishers', () => {
  const normal = computeSpectatorCameraPose({
    ax: -3,
    az: 0,
    bx: 3,
    bz: 0,
    elapsed: 1.5,
    focusEvent: 'normal',
    focusTimer: 0,
  });

  const parry = computeSpectatorCameraPose({
    ax: -3,
    az: 0,
    bx: 3,
    bz: 0,
    elapsed: 1.5,
    focusEvent: 'parry',
    focusTimer: 0.9,
  });

  const finisher = computeSpectatorCameraPose({
    ax: -3,
    az: 0,
    bx: 3,
    bz: 0,
    elapsed: 1.5,
    focusEvent: 'finisher',
    focusTimer: 1.2,
  });

  const distNormal = Math.hypot(normal.posX - normal.lookX, normal.posZ - normal.lookZ);
  const distParry = Math.hypot(parry.posX - parry.lookX, parry.posZ - parry.lookZ);
  const distFinisher = Math.hypot(finisher.posX - finisher.lookX, finisher.posZ - finisher.lookZ);

  assert.equal(normal.lookX, 0);
  assert.equal(normal.lookZ, 0);
  assert.ok(distParry < distNormal, 'Parry zoom should move camera closer');
  assert.ok(distFinisher < distParry, 'Finisher zoom should move camera closest');
  assert.ok(parry.fov < normal.fov, 'Parry should narrow FOV');
  assert.ok(finisher.fov < parry.fov, 'Finisher should narrow FOV the most');
  assert.ok(finisher.posY < normal.posY, 'Finisher should drop to dramatic low angle');
});
