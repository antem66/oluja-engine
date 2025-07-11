import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { getWinRollupText } from '../ui/UIManager.js'; // Import function to get text element
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// References to containers (need initialization)
/** @type {PIXI.Container | null} */
let assignedOverlayContainer = null; // Renamed from overlayContainer
/** @type {PIXI.Container | null} */
let particleContainer = null;
/** @type {NodeJS.Timeout | number | null} */ // Allow different interval types
let winOverlayAnimInterval = null; // Interval ID for big win text animation
const particles = []; // Array to hold active particle objects

// Symbol Animation Registry - Maps symbol IDs to custom animation functions
const symbolAnimations = new Map();

/**
 * Registers a custom animation for a specific symbol type
 * 
 * @param {string} symbolId - The symbol identifier (e.g., "FACE1", "KNIFE")
 * @param {Function} animationFn - Function(symbol, baseTimeline, config) that adds custom animations to the timeline
 */
export function registerSymbolAnimation(symbolId, animationFn) {
    symbolAnimations.set(symbolId, animationFn);
    console.log(`Registered custom animation for symbol: ${symbolId}`);
}

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
    assignedOverlayContainer = overlayCont; // Use assignedOverlayContainer
    particleContainer = particleCont;
    console.log("Animations initialized with containers.");
    
    // Setup default symbol animations
    setupDefaultSymbolAnimations();
}

/**
 * Sets up the default symbol animations for various symbol types
 */
function setupDefaultSymbolAnimations() {
    // SCATTER symbol - special purple glow and extra scaling
    registerSymbolAnimation("SCAT", (symbol, tl, config) => {
        const goldPurple = 0xFF00FF;
        const targetScale = 1.4;  // Larger scale for scatter

        // Add a special purple/gold flash effect
        tl.to(symbol, {
            tint: goldPurple,
            duration: config.duration * 0.5,
            ease: "sine.inOut",
            repeat: 3,
            yoyo: true
        }, config.duration * 0.3);
        
        // Override the scale animation to be more dramatic
        tl.to(symbol.scale, {
            x: config.originalScaleX * targetScale,
            y: config.originalScaleY * targetScale,
            duration: config.duration * 0.5,
            ease: "back.out(1.5)"
        }, config.duration * 0.3);
        
        return tl;
    });
    
    // FACE1 (gold face) - gold shimmer effect
    registerSymbolAnimation("FACE1", (symbol, tl, config) => {
        const brightGold = 0xFFFF00;
        const dimGold = 0xDAA520;
        
        // Add a golden shimmer effect
        tl.to(symbol, {
            tint: brightGold,
            duration: config.duration * 0.3,
            repeat: 4,
            yoyo: true,
            ease: "sine.inOut"
        }, config.duration * 0.3);
        
        return tl;
    });
    
    // KNIFE - slashing rotation effect
    registerSymbolAnimation("KNIFE", (symbol, tl, config) => {
        const fullRotation = Math.PI * 2;
        
        // Add a full rotation effect
        tl.to(symbol, {
            rotation: config.originalRotation + fullRotation,
            duration: config.duration * 1.1,
            ease: "power3.inOut"
        }, config.duration * 0.4);
        
        return tl;
    });
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
        const originalTint = symbol.tint;
        
        // Add subtle staggered delay for sequential effect based on symbol index
        const staggerDelay = index * 0.08 * winAnimDelayMultiplier;
        
        // Create gold tint for winning effect - slot machine style
        const goldTint = 0xFFDF00; // Gold color
        
        // Configuration object to pass to custom animations
        const animConfig = {
            duration,
            originalScaleX,
            originalScaleY,
            originalAlpha,
            originalRotation,
            originalTint,
            targetScaleUp,
            initialDipScale,
            easeType,
            easeBack,
            goldTint
        };

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

        // Initial attention-grabbing quick flash - common to all symbols
        tl.to(symbol, { 
            alpha: 1.5, // Slight overbright
            duration: duration * 0.2, 
            ease: "power1.in",
        }, 0)
        
        // Initial dip with slight rotation - common to all symbols
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
        }, 0);
        
        // Check if this symbol has a custom animation
        const symbolId = symbol.symbolId;
        const customAnimation = symbolAnimations.get(symbolId);
        
        if (customAnimation) {
            // Apply the custom animation, which can override or extend the timeline
            customAnimation(symbol, tl, animConfig);
        } else {
            // Default animation sequence for symbols without custom animations
            tl.to(symbol.scale, { 
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
            }, duration * 1.6);
        }
        
        // Ensure all symbols return to original state at the end - common ending
        tl.to(symbol.scale, { 
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
    // --- We're no longer using winRollupElement for regular wins ---
    // That's handled by UIManager.animateWin now
    
    // --- Big/Mega Win Text Animation ---
    if (!assignedOverlayContainer) {
        console.error("Animations: Overlay container not initialized for win animations.");
        return;
    }
    
    // Clear previous animation interval if any
    if (winOverlayAnimInterval) {
        clearInterval(winOverlayAnimInterval);
        winOverlayAnimInterval = null;
    }
    
    // Clear the dedicated win announcements container
    assignedOverlayContainer.removeChildren();

    // Define win thresholds
    const bigWinThreshold = currentTotalBet * 10;
    const megaWinThreshold = currentTotalBet * 25;
    let winTextStr = "";

    // Determine win level text
    if (winAmount >= megaWinThreshold) winTextStr = "MEGA WIN!";
    else if (winAmount >= bigWinThreshold) winTextStr = "BIG WIN!";

    // --- Big/Mega Win Text Animation ---
    if (winTextStr) {
        // Create the win text object directly
        const winOverlayText = new PIXI.Text({
            text: winTextStr + `\n€${winAmount.toFixed(2)}`,
            style: {
                fontFamily: "Impact, Charcoal, sans-serif",
                fontSize: 70,
                fill: 0xFFFF00, // Use single color instead of gradient array
                stroke: { color: 0x8B0000, width: 5 },
                dropShadow: { color: 0x000000, distance: 5, blur: 5, alpha: 0.8 },
                align: 'center',
            },
        });
        winOverlayText.anchor.set(0.5);
        winOverlayText.x = GAME_WIDTH / 2;
        winOverlayText.y = GAME_HEIGHT / 2 - 50;
        winOverlayText.scale.set(0.1);

        // Add directly to the assigned container
        assignedOverlayContainer.addChild(winOverlayText);

        let scale = 0.1;
        let alpha = 1.0;
        let phase = 0; // 0: scaling up, 1: holding, 2: fading out
        let holdCounter = 0;
        const holdDuration = 50; // Frames/intervals to hold at full size
        const animSpeed = 20; // Interval speed (ms)

        winOverlayAnimInterval = setInterval(() => {
            // Check winOverlayText directly (it's local to this scope now)
            if (!winOverlayText || !winOverlayText.parent) { // Stop if text is removed
                if (winOverlayAnimInterval) clearInterval(winOverlayAnimInterval);
                winOverlayAnimInterval = null;
                return;
            }

            const currentAnimSpeed = animSpeed * winAnimDelayMultiplier; // Adjust speed for turbo

            if (phase === 0) { // Scaling up
                scale += 0.05 * (currentAnimSpeed / 20);
                winOverlayText.scale.set(Math.min(1.0, scale));
                if (scale >= 1.0) {
                    phase = 1;
                    holdCounter = 0;
                }
            } else if (phase === 1) { // Holding
                holdCounter++;
                if (holdCounter * currentAnimSpeed >= holdDuration * 20) {
                    phase = 2;
                }
            } else if (phase === 2) { // Fading out
                alpha -= 0.04 * (currentAnimSpeed / 20);
                winOverlayText.alpha = Math.max(0, alpha);
                if (alpha <= 0) {
                    if (winOverlayAnimInterval) clearInterval(winOverlayAnimInterval);
                    winOverlayAnimInterval = null;
                    // Clean up the text from the container
                    if (assignedOverlayContainer && winOverlayText.parent) {
                        assignedOverlayContainer.removeChild(winOverlayText);
                    }
                    winOverlayText.destroy({ children: true }); // Clean up PIXI object
                }
            }
        }, animSpeed);
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
