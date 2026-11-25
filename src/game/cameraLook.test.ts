import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMERA_LOOK_DRAG_THRESHOLD_PX,
  CAMERA_PITCH_DEFAULT,
  CAMERA_PITCH_MAX,
  CAMERA_PITCH_MIN,
  applyCameraLookDelta,
  computeCameraOrbitPosition,
  dampCameraYaw,
  shouldCommitCameraDrag,
  transformMoveInputByCameraYaw,
} from './cameraLook';

test('applyCameraLookDelta turns view right on rightward drag and clamps vertical pitch', () => {
  const start = { yaw: 0, pitch: CAMERA_PITCH_DEFAULT };

  // Dragging right (dx > 0) turns view toward +X (yaw becomes negative)
  const rightTurn = applyCameraLookDelta(start, 120, 0, 'mouse');
  assert.ok(rightTurn.yaw < 0, 'rightward drag should decrease yaw');

  // Touch drag is slightly more responsive than mouse drag for the same pixel distance
  const touchRightTurn = applyCameraLookDelta(start, 120, 0, 'touch');
  assert.ok(
    Math.abs(touchRightTurn.yaw) > Math.abs(rightTurn.yaw),
    'touch look sensitivity should exceed mouse sensitivity'
  );

  // Extreme vertical drags clamp safely inside [CAMERA_PITCH_MIN, CAMERA_PITCH_MAX]
  const lookWayDown = applyCameraLookDelta(start, 0, 5000, 'mouse');
  assert.equal(lookWayDown.pitch, CAMERA_PITCH_MAX);

  const lookWayUp = applyCameraLookDelta(start, 0, -5000, 'mouse');
  assert.equal(lookWayUp.pitch, CAMERA_PITCH_MIN);
});

test('computeCameraOrbitPosition orbits smoothly across 360 degrees and stays above floor', () => {
  const frontPose = computeCameraOrbitPosition({
    anchorX: 0,
    anchorY: 1.35,
    anchorZ: 0,
    yaw: 0,
    pitch: CAMERA_PITCH_DEFAULT,
    distance: 9.0,
  });
  assert.ok(Math.abs(frontPose.x) < 1e-6);
  assert.ok(frontPose.z > 7.5);
  assert.ok(frontPose.y > 4.0);
  assert.ok(frontPose.lookZ < 0, 'forward lead should bias look target toward -Z at yaw 0');

  // Rotate 90 degrees right (yaw = -PI/2): camera sits on -X looking toward +X
  const rightPose = computeCameraOrbitPosition({
    anchorX: 0,
    anchorY: 1.35,
    anchorZ: 0,
    yaw: -Math.PI / 2,
    pitch: CAMERA_PITCH_DEFAULT,
    distance: 9.0,
  });
  assert.ok(rightPose.x < -7.5, 'camera should orbit to -X when viewing +X');
  assert.ok(Math.abs(rightPose.z) < 1e-5);
  assert.ok(rightPose.lookX > 0, 'forward lead should rotate toward +X');

  // Floor safety clamp
  const lowPose = computeCameraOrbitPosition({
    anchorX: 0,
    anchorY: 0.1,
    anchorZ: 0,
    yaw: 0,
    pitch: CAMERA_PITCH_MIN,
    distance: 2.0,
    minCameraY: 0.85,
  });
  assert.ok(lowPose.y >= 0.85);
});

test('transformMoveInputByCameraYaw aligns W/S/A/D and joystick movement with camera facing', () => {
  // Yaw = 0 (facing -Z): W (0, -1) -> (0, -1), D (1, 0) -> (1, 0)
  const w0 = transformMoveInputByCameraYaw(0, -1, 0);
  assert.ok(Math.abs(w0.worldX) < 1e-6 && Math.abs(w0.worldZ - -1) < 1e-6);

  // Yaw = -PI/2 (turned 90 deg right, facing +X): W (0, -1) -> (+1, 0), D (1, 0) -> (0, +1)
  const wRight = transformMoveInputByCameraYaw(0, -1, -Math.PI / 2);
  assert.ok(Math.abs(wRight.worldX - 1) < 1e-6 && Math.abs(wRight.worldZ) < 1e-6);
  const dRight = transformMoveInputByCameraYaw(1, 0, -Math.PI / 2);
  assert.ok(Math.abs(dRight.worldX) < 1e-6 && Math.abs(dRight.worldZ - 1) < 1e-6);

  // Yaw = PI (turned 180 deg, facing +Z): W (0, -1) -> (0, +1)
  const wBack = transformMoveInputByCameraYaw(0, -1, Math.PI);
  assert.ok(Math.abs(wBack.worldX) < 1e-6 && Math.abs(wBack.worldZ - 1) < 1e-6);
});

test('shouldCommitCameraDrag distinguishes taps from drags and dampCameraYaw wraps shortest path', () => {
  assert.equal(shouldCommitCameraDrag(100, 100, 100 + CAMERA_LOOK_DRAG_THRESHOLD_PX - 1, 100), false);
  assert.equal(shouldCommitCameraDrag(100, 100, 100 + CAMERA_LOOK_DRAG_THRESHOLD_PX + 1, 100), true);

  // Crossing the +PI / -PI wrap seam should interpolate the short way instead of spinning 350 degrees
  const stepped = dampCameraYaw(Math.PI - 0.1, -Math.PI + 0.1, 10, 0.05);
  assert.ok(Math.abs(Math.abs(stepped) - Math.PI) < 0.25);
});
