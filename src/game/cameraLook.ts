/**
 * Pure Camera Look / Touch Look math for 3rd-person orbit view and
 * camera-relative movement (mouse drag + multi-touch drag).
 */

export const CAMERA_LOOK_DRAG_THRESHOLD_PX = 6;
export const CAMERA_PITCH_MIN = 0.14; // ~8 deg (low heroic angle, stays above floor)
export const CAMERA_PITCH_MAX = 1.05; // ~60 deg (high tactical angle, avoids gimbal lock)
export const CAMERA_PITCH_DEFAULT = 0.37; // ~21 deg (matches classic third-person framing)

export const CAMERA_YAW_SENSITIVITY_MOUSE = 0.0055;
export const CAMERA_YAW_SENSITIVITY_TOUCH = 0.0072;
export const CAMERA_PITCH_SENSITIVITY_MOUSE = 0.0042;
export const CAMERA_PITCH_SENSITIVITY_TOUCH = 0.0055;

export interface CameraLookAngles {
  yaw: number;
  pitch: number;
}

export function normalizeCameraAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function clampCameraPitch(pitch: number): number {
  return Math.max(CAMERA_PITCH_MIN, Math.min(CAMERA_PITCH_MAX, pitch));
}

export function shouldCommitCameraDrag(
  startX: number,
  startY: number,
  currX: number,
  currY: number
): boolean {
  return Math.hypot(currX - startX, currY - startY) >= CAMERA_LOOK_DRAG_THRESHOLD_PX;
}

/**
 * Applies a screen-space drag delta (in CSS pixels) to camera yaw and pitch.
 * - Dragging right (dx > 0) turns the view right (decreases yaw around Y).
 * - Dragging down (dy > 0) tilts camera higher to look downward (increases pitch).
 */
export function applyCameraLookDelta(
  angles: CameraLookAngles,
  dx: number,
  dy: number,
  pointerType: string = 'mouse'
): CameraLookAngles {
  const isTouch = pointerType === 'touch' || pointerType === 'pen';
  const yawSens = isTouch ? CAMERA_YAW_SENSITIVITY_TOUCH : CAMERA_YAW_SENSITIVITY_MOUSE;
  const pitchSens = isTouch ? CAMERA_PITCH_SENSITIVITY_TOUCH : CAMERA_PITCH_SENSITIVITY_MOUSE;

  return {
    yaw: normalizeCameraAngle(angles.yaw - dx * yawSens),
    pitch: clampCameraPitch(angles.pitch + dy * pitchSens),
  };
}

/**
 * Computes shortest-path damped interpolation between current and target yaw angles.
 */
export function dampCameraYaw(
  currentYaw: number,
  targetYaw: number,
  lambda: number,
  dt: number
): number {
  const diff = normalizeCameraAngle(targetYaw - currentYaw);
  const t = 1 - Math.exp(-lambda * dt);
  return normalizeCameraAngle(currentYaw + diff * t);
}

export interface CameraOrbitPose {
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
  lookZ: number;
}

/**
 * Computes spherical 3rd-person orbit camera position and forward-biased look target.
 */
export function computeCameraOrbitPosition(opts: {
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  yaw: number;
  pitch: number;
  distance: number;
  sideOffset?: number;
  forwardLead?: number;
  minCameraY?: number;
}): CameraOrbitPose {
  const pitch = clampCameraPitch(opts.pitch);
  const sideOffset = opts.sideOffset ?? 0;
  const forwardLead = opts.forwardLead ?? 0.8;
  const minCameraY = opts.minCameraY ?? 0.85;

  const horizDist = Math.cos(pitch) * opts.distance;
  const vertDist = Math.sin(pitch) * opts.distance;
  const sinYaw = Math.sin(opts.yaw);
  const cosYaw = Math.cos(opts.yaw);

  return {
    x: opts.anchorX + sinYaw * horizDist + cosYaw * sideOffset,
    y: Math.max(minCameraY, opts.anchorY + vertDist),
    z: opts.anchorZ + cosYaw * horizDist - sinYaw * sideOffset,
    lookX: opts.anchorX - sinYaw * forwardLead,
    lookY: opts.anchorY,
    lookZ: opts.anchorZ - cosYaw * forwardLead,
  };
}

/**
 * Transforms screen-space directional input (WASD / joystick where inputZ = -1 is forward,
 * inputX = +1 is right) into world-space XZ movement aligned with the current camera yaw.
 */
export function transformMoveInputByCameraYaw(
  inputX: number,
  inputZ: number,
  camYaw: number
): { worldX: number; worldZ: number } {
  const cosYaw = Math.cos(camYaw);
  const sinYaw = Math.sin(camYaw);
  return {
    worldX: inputX * cosYaw + inputZ * sinYaw,
    worldZ: -inputX * sinYaw + inputZ * cosYaw,
  };
}
