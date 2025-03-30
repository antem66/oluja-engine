// Base settings (can be modified by Turbo Mode)
export let spinAcceleration = 0.1; // Increased from 0.05
export let maxSpinSpeed = 1.4; // Increased from 1.0
export let winAnimDelayMultiplier = 1.0;
export const REEL_STOP_STAGGER = 200; // Delay in ms between each reel stopping in normal mode

// New settings for fixed duration + tween stop
export const baseSpinDuration = 1000; // Base duration in ms for a normal spin before stop sequence starts
export const stopTweenDuration = 250; // ms duration of the final tween into stop position

// Turbo settings modifiers (applied directly where needed)
export const turboBaseSpinDuration = 100; // Base duration in ms for a turbo spin
export const turboReelStopStagger = 50; // Delay in ms between each reel stopping in turbo mode
export const turboReelStopTweenDuration = 100; // Duration in ms for the turbo GSAP stop animation
export const EARLY_STOP_DURATION = 100; // Duration in ms for the GSAP stop animation when user clicks stop
