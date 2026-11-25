export type SpectatorFocusEvent = 'normal' | 'parry' | 'finisher';

export interface SpectatorCameraInput {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  elapsed: number;
  focusEvent: SpectatorFocusEvent;
  focusTimer: number;
}

export interface SpectatorCameraPose {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

/**
 * Pure Cinematic Spectator camera solver for Dojo duels.
 * Orbits smoothly perpendicular to the duel line and dynamically zooms/pans
 * onto the combatants during high-intensity parries and combo finishers.
 */
export function computeSpectatorCameraPose(input: SpectatorCameraInput): SpectatorCameraPose {
  const midX = (input.ax + input.bx) * 0.5;
  const midZ = (input.az + input.bz) * 0.5;
  const sep = Math.hypot(input.bx - input.ax, input.bz - input.az);
  const duelAngle = Math.atan2(input.bz - input.az, input.bx - input.ax);

  const isDramatic = input.focusTimer > 0 && input.focusEvent !== 'normal';
  const orbitDrift = Math.sin(input.elapsed * 0.42) * 0.45;
  const sideOffset =
    input.focusEvent === 'parry'
      ? Math.PI * 0.5 + 0.35
      : input.focusEvent === 'finisher'
        ? Math.PI * 0.5 - 0.45
        : Math.PI * 0.5 + orbitDrift;

  const camAngle = duelAngle + sideOffset;
  const baseDist = Math.max(7.4, Math.min(13.5, sep * 1.18 + 5.6));
  const dist = isDramatic
    ? input.focusEvent === 'finisher'
      ? Math.max(5.0, baseDist * 0.58)
      : Math.max(5.6, baseDist * 0.66)
    : baseDist;

  const height = isDramatic
    ? input.focusEvent === 'finisher'
      ? 2.35
      : 2.8
    : Math.max(4.4, Math.min(6.4, 3.8 + sep * 0.2));

  return {
    posX: midX + Math.cos(camAngle) * dist,
    posY: height,
    posZ: midZ + Math.sin(camAngle) * dist,
    lookX: midX,
    lookY: isDramatic ? 1.45 : 1.35,
    lookZ: midZ,
    fov: isDramatic ? (input.focusEvent === 'finisher' ? 40 : 44) : 52,
  };
}
