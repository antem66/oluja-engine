// Base settings (can be modified by Turbo Mode)
export let spinAcceleration = 0.05;
export let maxSpinSpeed = 1.0;
export let spinDeceleration = 0.985;
export let minSpinSpeedBeforeSnap = 0.05;
export let stopDelayBase = 1000; // Minimum spin duration before first reel stops
export let winAnimDelayMultiplier = 1.0;

// Turbo settings modifiers (applied in TurboMode.js)
export const turboSpinAcceleration = 0.15;
export const turboMaxSpinSpeed = 1.8;
export const turboSpinDeceleration = 0.96;
export const turboMinSpinSpeedBeforeSnap = 0.2;
export const turboStopDelayBase = 100;
export const turboWinAnimDelayMultiplier = 0.2;

// Bounce animation
export const OVERSHOOT_AMOUNT = 0.15;
export const OVERSHOOT_DURATION = 120; // ms
export const BOUNCE_BACK_DURATION = 180; // ms
export let skipBounceInTurbo = true; // Configurable turbo behavior

// Function to update settings (used by TurboMode)
export function updateAnimationSettings(isTurbo) {
  if (isTurbo) {
    spinAcceleration = turboSpinAcceleration;
    maxSpinSpeed = turboMaxSpinSpeed;
    spinDeceleration = turboSpinDeceleration;
    minSpinSpeedBeforeSnap = turboMinSpinSpeedBeforeSnap;
    stopDelayBase = turboStopDelayBase;
    winAnimDelayMultiplier = turboWinAnimDelayMultiplier;
  } else {
    spinAcceleration = 0.05; // Reset to default
    maxSpinSpeed = 1.0; // Reset to default
    spinDeceleration = 0.985; // Reset to default
    minSpinSpeedBeforeSnap = 0.05; // Reset to default
    stopDelayBase = 1000; // Reset to default
    winAnimDelayMultiplier = 1.0; // Reset to default
  }
}
