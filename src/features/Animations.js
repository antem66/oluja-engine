import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { getWinRollupText } from '../ui/UIManager.js'; // Import function to get text element
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// References to containers (need initialization)
let overlayContainer = null;
let particleContainer = null;
let winOverlayAnimInterval = null; // Interval ID for big win text animation
const particles = []; // Array to hold active particle objects

/**
 * Initializes references to necessary PIXI containers.
 * @param {PIXI.Container} overlayCont - Container for big win text overlays.
 * @param {PIXI.Container} particleCont - Container for particle effects.
 */
export function initAnimations(overlayCont, particleCont) {
    if (!overlayCont || !particleCont) {
        console.error("Animations: Provided containers are invalid.");
        return;
    }
    overlayContainer = overlayCont;
    particleContainer = particleCont;
    console.log("Animations initialized with containers.");
}

/**
 * Animates the scale of winning symbols with a bounce effect.
 * @param {Array<import('../core/Symbol.js').SymbolSprite>} symbolsToAnimate - Array of SymbolSprite instances to animate.
 */
export function animateWinningSymbols(symbolsToAnimate) {
    if (!symbolsToAnimate || symbolsToAnimate.length === 0) return;

    const baseDuration = 0.35; // Increased base duration for longer animation
    const duration = baseDuration * winAnimDelayMultiplier;
    const targetScaleUp = 1.25; // Increased scale factor for more impact
    const initialDipScale = 0.9; // Deeper initial dip
    const easeType = "power2.out"; // Smoother ease out
    const easeBack = "elastic.out(1.2, 0.5)"; // More pronounced bounce

    // Track symbols by their unique ID to prevent duplicates
    const seenSymbols = new Set();
    
    symbolsToAnimate.forEach((symbol, index) => {
        // Skip if symbol is already being seen in this animation batch or is already animating
        if (!symbol?.scale || symbol.isAnimating || seenSymbols.has(symbol)) return;
        
        // Mark this symbol as seen in this animation batch
        seenSymbols.add(symbol);
        
        // Mark the symbol as animating to prevent multiple animations from running
        symbol.isAnimating = true;
        
        // Kill any existing tweens targeting this symbol or its scale
        gsap.killTweensOf(symbol);
        gsap.killTweensOf(symbol.scale);

        // Store original values
        const originalScaleX = symbol.scale.x;
        const originalScaleY = symbol.scale.y;
        const originalAlpha = symbol.alpha;
        const originalRotation = symbol.rotation;
        
        // Add subtle staggered delay for sequential effect based on symbol index
        const staggerDelay = index * 0.08 * winAnimDelayMultiplier;
        
        // Create gold tint for winning effect - slot machine style
        const goldTint = 0xFFDF00; // Gold color
        const originalTint = symbol.tint;

        // Main animation timeline
        const tl = gsap.timeline({
            delay: staggerDelay,
            onComplete: () => {
                // Reset properties that might not be explicitly reset in the timeline
                symbol.tint = originalTint;
                symbol.alpha = originalAlpha;
                symbol.rotation = originalRotation;
                symbol.isAnimating = false;
            }
        });

        // Initial attention-grabbing quick flash
        tl.to(symbol, { 
            alpha: 1.5, // Slight overbright
            duration: duration * 0.2, 
            ease: "power1.in",
        }, 0)
        
        // Initial dip with slight rotation
        .to(symbol.scale, { 
            x: originalScaleX * initialDipScale, 
            y: originalScaleY * initialDipScale, 
            duration: duration * 0.3, 
            ease: "power2.in" 
        }, 0)
        .to(symbol, {
            rotation: originalRotation - 0.05,
            duration: duration * 0.3,
            ease: "power1.in"
        }, 0)
        
        // Pop up larger with gold tint
        .to(symbol.scale, { 
            x: originalScaleX * targetScaleUp, 
            y: originalScaleY * targetScaleUp, 
            duration: duration * 0.5, 
            ease: easeType 
        }, duration * 0.3)
        .to(symbol, {
            tint: goldTint,
            rotation: originalRotation + 0.08,
            duration: duration * 0.5,
            ease: "power1.out"
        }, duration * 0.3)
        
        // Pulsing phase - two subtle pulses while gold
        .to(symbol.scale, {
            x: originalScaleX * (targetScaleUp * 0.9),
            y: originalScaleY * (targetScaleUp * 0.9),
            duration: duration * 0.4,
            ease: "sine.inOut"
        }, duration * 0.8)
        .to(symbol.scale, {
            x: originalScaleX * targetScaleUp,
            y: originalScaleY * targetScaleUp,
            duration: duration * 0.4,
            ease: "sine.inOut"
        }, duration * 1.2)
        .to(symbol.scale, {
            x: originalScaleX * (targetScaleUp * 0.95),
            y: originalScaleY * (targetScaleUp * 0.95),
            duration: duration * 0.3,
            ease: "sine.inOut"
        }, duration * 1.6)
        
        // Final return to original state with elastic bounce
        .to(symbol.scale, { 
            x: originalScaleX, 
            y: originalScaleY, 
            duration: duration * 0.8, 
            ease: easeBack 
        }, duration * 1.9)
        .to(symbol, {
            tint: originalTint,
            rotation: originalRotation,
            duration: duration * 0.8,
            ease: "power1.inOut"
        }, duration * 1.9);
    });
}

/**
 * Plays big/mega win text animations and triggers particle effects.
 * @param {number} winAmount - The total amount won in the spin.
 * @param {number} currentTotalBet - The total bet amount for the spin (for threshold calculation).
 */
export function playWinAnimations(winAmount, currentTotalBet) {
    const winRollupElement = getWinRollupText(); // Get the text element

    // --- Win Rollup Animation ---
    if (winRollupElement && winAmount > 0) {
        winRollupElement.text = `€0.00`; // Reset text
        winRollupElement.visible = true; // Make it visible
        winRollupElement.alpha = 1; // Ensure alpha is reset

        // Use a temporary object for GSAP to tween a numeric value
        const counter = { value: 0 };
        // Duration based on win amount, e.g., 0.5s for small wins up to 2s for large wins
        const rollupDuration = Math.max(0.5, Math.min(2.0, winAmount * 0.02));

        gsap.to(counter, {
            value: winAmount,
            duration: rollupDuration * winAnimDelayMultiplier, // Apply turbo multiplier
            ease: "power1.out",
            onUpdate: () => {
                if (winRollupElement) { // Check if element still exists
                    winRollupElement.text = `€${counter.value.toFixed(2)}`;
                }
            },
            onComplete: () => {
                // Optionally hide rollup after a delay, or let it stay until next spin starts
                // We'll hide it after 1.5 seconds delay
                 if (winRollupElement) {
                    gsap.to(winRollupElement, {
                        alpha: 0,
                        delay: 1.5 * winAnimDelayMultiplier,
                        duration: 0.3 * winAnimDelayMultiplier,
                        onComplete: () => { if (winRollupElement) winRollupElement.visible = false; }
                    });
                 }
            }
        });
    } else if (winRollupElement) {
        // Ensure rollup is hidden if there's no win
        winRollupElement.visible = false;
    }


    // --- Big/Mega Win Text Animation (Keep existing logic) ---
    if (!overlayContainer) {
        console.error("Animations: Overlay container not initialized for win animations.");
        return;
    }
    // Clear previous animation interval if any
    if (winOverlayAnimInterval) clearInterval(winOverlayAnimInterval);
    overlayContainer.removeChildren(); // Clear previous win text

    // Define win thresholds
    const bigWinThreshold = currentTotalBet * 10;
    const megaWinThreshold = currentTotalBet * 25;
    let winTextStr = "";

    // Determine win level text
    if (winAmount >= megaWinThreshold) winTextStr = "MEGA WIN!";
    else if (winAmount >= bigWinThreshold) winTextStr = "BIG WIN!";

    // --- Big/Mega Win Text Animation ---
    if (winTextStr) {
        const winOverlayText = new PIXI.Text({
            text: winTextStr + `\n€${winAmount.toFixed(2)}`,
            style: {
                fontFamily: "Impact, Charcoal, sans-serif",
                fontSize: 70,
                fill: [0xffff00, 0xffaa00], // Use hex numbers
                stroke: { color: "#8B0000", width: 5 },
                dropShadow: { color: "#000", distance: 5, blur: 5, alpha: 0.8 },
                align: 'center', // Use string literal
                // lineSpacing: 10, // Removed invalid property
            },
        });
        winOverlayText.anchor.set(0.5);
        winOverlayText.x = GAME_WIDTH / 2;
        winOverlayText.y = GAME_HEIGHT / 2 - 50; // Position slightly above center
        winOverlayText.scale.set(0.1); // Start small
        overlayContainer.addChild(winOverlayText);

        let scale = 0.1;
        let alpha = 1.0;
        let phase = 0; // 0: scaling up, 1: holding, 2: fading out
        let holdCounter = 0;
        const holdDuration = 50; // Frames/intervals to hold at full size
        const animSpeed = 20; // Interval speed (ms)

        winOverlayAnimInterval = setInterval(() => {
            if (!winOverlayText?.parent) { // Stop if text is removed
                clearInterval(winOverlayAnimInterval);
                return;
            }

            const currentAnimSpeed = animSpeed * winAnimDelayMultiplier; // Adjust speed for turbo

            if (phase === 0) { // Scaling up
                scale += 0.05 * (currentAnimSpeed / 20); // Adjust scale increment based on speed
                winOverlayText.scale.set(Math.min(1.0, scale));
                if (scale >= 1.0) {
                    phase = 1; // Move to hold phase
                    holdCounter = 0;
                }
            } else if (phase === 1) { // Holding
                holdCounter++;
                if (holdCounter * currentAnimSpeed >= holdDuration * 20) { // Adjust hold duration based on speed
                    phase = 2; // Move to fade out phase
                }
            } else if (phase === 2) { // Fading out
                alpha -= 0.04 * (currentAnimSpeed / 20); // Adjust alpha decrement
                winOverlayText.alpha = Math.max(0, alpha);
                if (alpha <= 0) {
                    clearInterval(winOverlayAnimInterval); // Stop animation
                    if (winOverlayText.parent) overlayContainer.removeChild(winOverlayText);
                    winOverlayText.destroy(); // Clean up
                }
            }
        }, animSpeed); // Base interval remains 20ms, logic adjusts based on multiplier
    }

    // --- Particle Effect ---
    // Trigger particles based on win amount relative to bet
    const numParticles = Math.min(60, Math.floor((winAmount / currentTotalBet) * 3));
    if (numParticles > 0) {
        createParticles(numParticles);
    }
}

/**
 * Creates a specified number of particle objects.
 * @param {number} count - The number of particles to create.
 */
function createParticles(count) {
    if (!particleContainer) {
        console.error("Animations: Particle container not initialized.");
        return;
    }
    for (let i = 0; i < count; i++) {
        const p = {
            gfx: new PIXI.Graphics()
                .circle(0, 0, Math.random() * 5 + 3) // Random size
                .fill({ color: Math.random() > 0.5 ? 0xffd700 : 0xf1c40f }), // Random gold/yellow
            vx: (Math.random() - 0.5) * 8, // Horizontal velocity
            vy: -Math.random() * 10 - 8, // Initial upward velocity
            gravity: 0.35,
            life: Math.random() * 80 + 40, // Lifetime in frames/updates
            alpha: 1.0,
        };
        p.fade = 1 / p.life; // Alpha fade per update
        // Start position around center
        p.gfx.x = GAME_WIDTH / 2 + (Math.random() - 0.5) * 100;
        p.gfx.y = GAME_HEIGHT / 2 + 50;
        particles.push(p);
        particleContainer.addChild(p.gfx);
    }
}

/**
 * Updates the position and state of all active particles.
 * Should be called in the main game loop.
 * @param {number} delta - Time delta since the last frame (usually from ticker).
 */
export function updateParticles(delta) {
    if (!particleContainer) return; // Don't run if not initialized

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Apply physics
        p.vy += p.gravity * delta;
        p.gfx.x += p.vx * delta;
        p.gfx.y += p.vy * delta;

        // Update lifetime and alpha
        p.life -= delta;
        p.alpha -= p.fade * delta;
        p.gfx.alpha = Math.max(0, p.alpha);

        // Remove particle if life ended, faded out, or went off-screen
        if (p.life <= 0 || p.alpha <= 0 || p.gfx.y > GAME_HEIGHT + 20) {
            particleContainer.removeChild(p.gfx);
            p.gfx.destroy();
            particles.splice(i, 1); // Remove from active array
        }
    }
}
