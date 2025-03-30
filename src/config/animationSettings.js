// Base settings (can be modified by Turbo Mode)
export let spinAcceleration = 0.1; // Increased from 0.05
export let maxSpinSpeed = 1.4; // Increased from 1.0
export let spinDeceleration = 0.92; // Increased deceleration for faster stop
export let minSpinSpeedBeforeSnap = 0.05;
export let stopDelayBase = 300; // Reduced initial delay
export let winAnimDelayMultiplier = 1.0;
export const REEL_STOP_STAGGER = 200; // Delay in ms between each reel stopping in normal mode

// New settings for fixed duration + tween stop
export const baseSpinDuration = 1000; // Base duration in ms for a normal spin before stop sequence starts
export const stopTweenDuration = 250; // ms duration of the final tween into stop position
export const reelStopTweenDuration = 400; // Duration in ms for the GSAP ease-out stop animation

// Turbo settings modifiers (applied directly where needed)
export const turboSpinAcceleration = 0.15;
export const turboMaxSpinSpeed = 1.8;
// export const turboSpinDeceleration = 0.96; // No longer used by tween logic
// export const turboMinSpinSpeedBeforeSnap = 0.2; // No longer used by tween logic
// export const turboStopDelayBase = 100; // No longer used by tween logic
export const turboWinAnimDelayMultiplier = 0.2;
export const turboBaseSpinDuration = 100; // Base duration in ms for a turbo spin
export const turboReelStopStagger = 50; // Delay in ms between each reel stopping in turbo mode
export const turboReelStopTweenDuration = 100; // Duration in ms for the turbo GSAP stop animation
export const EARLY_STOP_DURATION = 100; // Duration in ms for the GSAP stop animation when user clicks stop

// Bounce animation (Keep for reference, but skipBounce is unused now)
export const OVERSHOOT_AMOUNT = 0.15;
export const OVERSHOOT_DURATION = 120; // ms
export const BOUNCE_BACK_DURATION = 180; // ms
export let skipBounceInTurbo = true; // Configurable turbo behavior (Currently unused by tween logic)

// Removed updateAnimationSettings function - settings are applied directly based on state.isTurboMode

export const BIG_WIN_THRESHOLD_MULTIPLIER = 15;
export const MEGA_WIN_THRESHOLD_MULTIPLIER = 30;

// Reduce duration for faster button enable
export const WIN_ROLLUP_DURATION = 1.5; // Default duration in seconds for the win amount rollup

// Symbol Animation Durations (Example)
export const SYMBOL_WIN_FLASH_DURATION = 0.5; // Duration of the symbol win flash/scale animation

// Win Rollup Duration (Could be dynamic based on win amount)
export const WIN_ROLLUP_DURATION_OLD = 1.5; // Default duration in seconds for the win amount rollup

// Big Win Animation Durations
export const BIG_WIN_TEXT_APPEAR_DURATION = 0.3; // Time for big win text to fade/scale in
export const BIG_WIN_TEXT_STAY_DURATION = 2.0; // Time the big win text stays visible
export const BIG_WIN_TEXT_DISAPPEAR_DURATION = 0.5; // Time for big win text to fade/scale out

// Particle Effect Durations (if applicable)
export const PARTICLE_BURST_DURATION = 1.0; // How long particle bursts last

// UI Animation Durations
export const BUTTON_FEEDBACK_DURATION = 0.1; // Duration for button click/hover feedback animations
export const NOTIFICATION_FADE_DURATION = 0.4; // Duration for notification message fade in/out

// Free Spins Transition Durations
export const FREE_SPINS_ENTRY_ANIMATION_DURATION = 1.5;
export const FREE_SPINS_EXIT_ANIMATION_DURATION = 1.0;
