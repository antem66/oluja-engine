// Base settings (can be modified by Turbo Mode)
export let spinAcceleration = 0.1; // Increased from 0.05
export let maxSpinSpeed = 1.4; // Increased from 1.0
export let spinDeceleration = 0.985; // Keeping deceleration the same for now
export let minSpinSpeedBeforeSnap = 0.05;
export let stopDelayBase = 500; // Decreased from 1000ms
export let winAnimDelayMultiplier = 1.0;
export const REEL_STOP_STAGGER = 150; // ms delay between initiating each reel stop

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
    spinAcceleration = 0.1; // Reset to NEW default
    maxSpinSpeed = 1.4; // Reset to new default
    spinDeceleration = 0.985; // Reset to default
    minSpinSpeedBeforeSnap = 0.05; // Reset to default
    stopDelayBase = 500; // Reset to new default
    winAnimDelayMultiplier = 1.0; // Reset to default
  }
}
