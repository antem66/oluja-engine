// Base settings (can be modified by Turbo Mode)
export let spinAcceleration = 0.1; // Increased from 0.05
export let maxSpinSpeed = 1.4; // Increased from 1.0
export let spinDeceleration = 0.92; // Increased deceleration for faster stop
export let minSpinSpeedBeforeSnap = 0.05;
export let stopDelayBase = 300; // Reduced initial delay
export let winAnimDelayMultiplier = 1.0;
export const REEL_STOP_STAGGER = 150; // Slower stagger for normal mode

// New settings for fixed duration + tween stop
export let baseSpinDuration = 1500; // Slower base duration for normal mode
export let stopTweenDuration = 250; // ms duration of the final tween into stop position

// Turbo settings modifiers (applied directly where needed)
export const turboSpinAcceleration = 0.15;
export const turboMaxSpinSpeed = 1.8;
// export const turboSpinDeceleration = 0.96; // No longer used by tween logic
// export const turboMinSpinSpeedBeforeSnap = 0.2; // No longer used by tween logic
// export const turboStopDelayBase = 100; // No longer used by tween logic
export const turboWinAnimDelayMultiplier = 0.2;
export const turboBaseSpinDuration = 500; // Faster duration for turbo
export const turboReelStopStagger = 50;   // Tighter stagger for turbo

// Bounce animation (Keep for reference, but skipBounce is unused now)
export const OVERSHOOT_AMOUNT = 0.15;
export const OVERSHOOT_DURATION = 120; // ms
export const BOUNCE_BACK_DURATION = 180; // ms
export let skipBounceInTurbo = true; // Configurable turbo behavior (Currently unused by tween logic)

// Removed updateAnimationSettings function - settings are applied directly based on state.isTurboMode
