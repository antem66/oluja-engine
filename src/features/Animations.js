/**
 * @module Animations
 * @description Manages various game animations, including symbol win animations,
 * big win text overlays, and particle effects. Provides functions to trigger
 * these animations and allows registration of custom symbol animations.
 *
 * Public API:
 * - initAnimations(dependencies): Initializes and registers animations with AnimationController.
 * - registerSymbolAnimation(symbolId, animationFn): Registers a custom animation function for a symbol.
 * - updateParticles(delta): Updates active particle animations (called by game loop).
 *
 * Dependencies (Injected via init):
 * - logger: Instance of Logger.
 * - animationController: Instance of AnimationController.
 * - overlayContainer: PIXI.Container for text overlays.
 * - particleContainer: PIXI.Container for particles.
 *
 * Events Emitted: (None currently planned)
 *
 * Events Consumed: (None - animations triggered via AnimationController)
 */

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameSettings.js';

// Import types for JSDoc
import { Logger } from '../utils/Logger.js';
import { AnimationController } from '../core/AnimationController.js';

// Module-level variables for dependencies and containers
/** @type {Logger | null} */
let logger = null;
/** @type {AnimationController | null} */
let animationController = null;
/** @type {PIXI.Container | null} */
let assignedOverlayContainer = null;
/** @type {PIXI.Container | null} */
let particleContainer = null;

/** @type {NodeJS.Timeout | number | null} */
let winOverlayAnimInterval = null;
const particles = [];
const symbolAnimations = new Map();

/**
 * Registers a custom animation for a specific symbol type
 *
 * @param {string} symbolId - The symbol identifier (e.g., "FACE1", "KNIFE")
 * @param {Function} animationFn - Function(symbol, baseTimeline, config) that adds custom animations to the timeline
 */
export function registerSymbolAnimation(symbolId, animationFn) {
    symbolAnimations.set(symbolId, animationFn);
    logger?.debug('Animations', `Registered custom animation for symbol: ${symbolId}`);
}

/**
 * Initializes references, sets up default animations, and registers core animations.
 * @param {object} dependencies
 * @param {Logger} dependencies.logger
 * @param {AnimationController} dependencies.animationController
 * @param {PIXI.Container} dependencies.overlayContainer 
 * @param {PIXI.Container} dependencies.particleContainer
 */
export function initAnimations(dependencies) {
    if (!dependencies || !dependencies.logger || !dependencies.animationController || !dependencies.overlayContainer || !dependencies.particleContainer) {
        console.error("Animations Init Error: Missing dependencies (logger, animationController, overlayContainer, particleContainer).");
        return;
    }
    logger = dependencies.logger;
    animationController = dependencies.animationController;
    assignedOverlayContainer = dependencies.overlayContainer;
    particleContainer = dependencies.particleContainer;
    
    logger.info("Animations", "Initialized and dependencies stored.");

    setupDefaultSymbolAnimations();

    // Register core animation functions with the AnimationController
    animationController.registerAnimation('symbolWin', animateWinningSymbols);
    animationController.registerAnimation('bigWinText', _playBigWinText);
    animationController.registerAnimation('particleBurst', createParticles);
    
    logger.info("Animations", "Core animations registered with AnimationController.");
}

/**
 * Sets up the default symbol animations for various symbol types
 * (This logic might move or be structured differently with plugins)
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
 * Triggered via AnimationController.playAnimation('symbolWin', { symbols: [...] })
 * @param {object} data - Data payload from AnimationController.
 * @param {Array<import('../core/Symbol.js').SymbolSprite>} data.symbolsToAnimate - Array of SymbolSprite instances to animate.
 */
export function animateWinningSymbols(data) {
    logger?.debug('Animations', 'animateWinningSymbols execution started.', data);
    
    if (!data || !data.symbolsToAnimate || data.symbolsToAnimate.length === 0) {
        logger?.debug('Animations', 'animateWinningSymbols called with no symbols.');
        return;
    }
    const symbolsToAnimate = data.symbolsToAnimate;
    logger?.debug('Animations', `Animating ${symbolsToAnimate.length} winning symbols...`);

    const baseDuration = 0.35;
    const duration = baseDuration * winAnimDelayMultiplier;
    const targetScaleUp = 1.25;
    const initialDipScale = 0.9;
    const easeType = "power2.out";
    const easeBack = "elastic.out(1.2, 0.5)";

    const seenSymbols = new Set();
    
    symbolsToAnimate.forEach((symbol, index) => {
        if (!symbol?.scale || symbol.isAnimating || seenSymbols.has(symbol)) return;
        
        seenSymbols.add(symbol);
        symbol.isAnimating = true;
        
        gsap.killTweensOf(symbol);
        gsap.killTweensOf(symbol.scale);

        const originalScaleX = symbol.scale.x;
        const originalScaleY = symbol.scale.y;
        const originalAlpha = symbol.alpha;
        const originalRotation = symbol.rotation;
        const originalTint = symbol.tint;
        
        const staggerDelay = index * 0.08 * winAnimDelayMultiplier;
        const goldTint = 0xFFDF00;
        
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

        const tl = gsap.timeline({
            delay: staggerDelay,
            onComplete: () => {
                symbol.tint = originalTint;
                symbol.alpha = originalAlpha;
                symbol.rotation = originalRotation;
                symbol.isAnimating = false;
            }
        });

        tl.to(symbol, { 
            alpha: 1.5, 
            duration: duration * 0.2, 
            ease: "power1.in",
        }, 0)
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
        
        const symbolId = symbol.symbolId;
        const customAnimation = symbolAnimations.get(symbolId);
        
        if (customAnimation) {
            customAnimation(symbol, tl, animConfig);
        } else {
            // Default animation sequence
            tl.to(symbol.scale, { 
                x: originalScaleX * targetScaleUp,
                y: originalScaleY * targetScaleUp,
                duration: duration * 0.8, // Slightly longer upward scale
                ease: easeType
            }, ">0.05") // Start slightly after dip starts returning
            .to(symbol.scale, { 
                x: originalScaleX,
                y: originalScaleY,
                duration: duration * 0.6, // Longer settle back down
                ease: easeBack // Apply elastic bounce back
            }, ">0.1") // Start settling back shortly after reaching peak
            .to(symbol, {
                tint: goldTint,
                duration: duration * 0.3,
                yoyo: true,
                repeat: 3, // Flash gold 3 times
                ease: "sine.inOut"
            }, duration * 0.3)
            .to(symbol, {
                rotation: originalRotation,
                duration: duration * 0.6,
                ease: easeBack
            }, duration * 0.4);
        }
    });
}

/**
 * Displays Big/Mega Win text overlays and triggers particle effects.
 * Triggered via AnimationController.playAnimation('bigWinText', { winAmount: ..., currentTotalBet: ... })
 * @param {object} data - Data payload.
 * @param {number} data.winAmount - The total win amount for the spin.
 * @param {number} data.currentTotalBet - The total bet amount for the spin.
 */
function _playBigWinText(data) {
    logger?.debug('Animations', '_playBigWinText execution started.', data);

    if (!data) return;
    const { winAmount, currentTotalBet } = data;
    logger?.debug('Animations', `_playBigWinText called with win: ${winAmount}, bet: ${currentTotalBet}`);
    
    if (winAmount <= 0 || currentTotalBet <= 0 || !assignedOverlayContainer) return;

    const winMultiplier = winAmount / currentTotalBet;
    let winLevel = null; // 'BIG', 'MEGA', 'EPIC'
    let winText = "";
    let particleCount = 0;
    let winTextColor = 0xFFFF00; // Default gold

    // Define win level thresholds (example values, adjust as needed)
    const bigWinThreshold = 15;
    const megaWinThreshold = 40;
    const epicWinThreshold = 75;

    if (winMultiplier >= epicWinThreshold) {
        winLevel = 'EPIC';
        winText = "EPIC WIN!";
        particleCount = 150;
        winTextColor = 0xFF00FF; // Magenta for Epic
    } else if (winMultiplier >= megaWinThreshold) {
        winLevel = 'MEGA';
        winText = "MEGA WIN!";
        particleCount = 100;
        winTextColor = 0x00FFFF; // Cyan for Mega
    } else if (winMultiplier >= bigWinThreshold) {
        winLevel = 'BIG';
        winText = "BIG WIN!";
        particleCount = 50;
        winTextColor = 0xFF8C00; // Dark Orange for Big
    }

    if (winLevel) {
        logger?.info('Animations', `Triggering ${winLevel} Win presentation.`);
        // Clear any previous interval
        if (winOverlayAnimInterval) {
            clearInterval(winOverlayAnimInterval);
            winOverlayAnimInterval = null;
        }
        // Remove existing win text if any
        const existingText = assignedOverlayContainer.getChildByName("winOverlayText");
        if (existingText) {
            assignedOverlayContainer.removeChild(existingText);
            existingText.destroy();
        }

        // Create the FillGradient instance
        const fillGradient = new PIXI.FillGradient({
            type: 'linear', // Specify linear gradient
            colorStops: [
                { offset: 0.3, color: winTextColor }, // Use the determined color
                { offset: 0.7, color: 0xFFFFFF },     // White
            ],
            // Define gradient start/end points if needed (defaults likely vertical)
            // start: { x: 0, y: 0 },
            // end: { x: 0, y: 1 }, 
        });

        const winTextStyle = new PIXI.TextStyle({
            fontFamily: 'Arial', 
            fontSize: 80,
            fontWeight: 'bold',
            fill: fillGradient, 
            stroke: { color: 0x000000, width: 5 }, 
            dropShadow: { // Define the object to enable drop shadow
                color: 0x000000, 
                blur: 10,
                angle: Math.PI / 4,
                distance: 8,
                alpha: 0.75 
            },
            align: 'center'
        });

        const winOverlayText = new PIXI.Text({ text: winText, style: winTextStyle });
        winOverlayText.anchor.set(0.5);
        winOverlayText.x = GAME_WIDTH / 2;
        winOverlayText.y = GAME_HEIGHT / 2 - 50; // Position slightly above center
        winOverlayText.name = "winOverlayText";
        winOverlayText.alpha = 0;
        winOverlayText.scale.set(0.5);

        assignedOverlayContainer.addChild(winOverlayText);

        // Entrance animation
        gsap.to(winOverlayText, { alpha: 1, duration: 0.4, ease: "power2.out" });
        gsap.to(winOverlayText.scale, { x: 1, y: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });

        // Pulsing animation using interval for continuous effect
        let scaleDirection = 1;
        winOverlayAnimInterval = setInterval(() => {
            const targetScale = 1 + (0.05 * scaleDirection);
            gsap.to(winOverlayText.scale, { 
                x: targetScale, 
                y: targetScale, 
                duration: 0.7, // Slower pulse
                ease: "sine.inOut" 
            });
            scaleDirection *= -1; // Reverse direction
        }, 800); // Interval matches duration + small buffer

        // Trigger particle burst via AnimationController
        if (particleCount > 0) {
             animationController?.playAnimation('particleBurst', { count: particleCount });
        }

        // Automatically remove after a duration
        const displayDuration = 4000 * winAnimDelayMultiplier; // Longer display time
        setTimeout(() => {
            if (winOverlayAnimInterval) {
                clearInterval(winOverlayAnimInterval);
                winOverlayAnimInterval = null;
            }
            if (winOverlayText.parent) { // Check if still attached
                 gsap.to(winOverlayText, { 
                     alpha: 0, 
                     duration: 0.5, 
                     ease: "power2.in",
                     onComplete: () => {
                         if (winOverlayText.parent) {
                            assignedOverlayContainer?.removeChild(winOverlayText);
                            winOverlayText.destroy();
                         }
                     }
                });
            }
        }, displayDuration);
        
    } else {
        logger?.debug('Animations', 'Win amount did not trigger Big/Mega/Epic presentation.');
    }
}

/**
 * Creates particle effects.
 * Triggered via AnimationController.playAnimation('particleBurst', { count: ... })
 * @param {object} data - Data payload.
 * @param {number} data.count - Number of particles to create.
 */
function createParticles(data) {
    logger?.debug('Animations', 'createParticles execution started.', data);
    
    if (!particleContainer || !data || typeof data.count !== 'number' || data.count <= 0) {
        logger?.warn('Animations', 'Cannot create particles - container missing or invalid count.', { data });
        return;
    }
    const count = data.count;
    logger?.debug('Animations', `Creating ${count} particles.`);

    for (let i = 0; i < count; i++) {
        const particle = new PIXI.Graphics();
        const size = Math.random() * 5 + 2;
        const color = Math.random() * 0xFFFFFF;
        
        particle.circle(0, 0, size).fill({ color });
        particle.x = Math.random() * GAME_WIDTH;
        particle.y = Math.random() * GAME_HEIGHT;
        particle.alpha = 1;
        // @ts-ignore - Add custom properties for animation
        particle.vx = Math.random() * 4 - 2;
        // @ts-ignore
        particle.vy = Math.random() * -5 - 2; // Bias upwards
        // @ts-ignore
        particle.life = Math.random() * 1 + 0.5; // Lifespan in seconds

        particleContainer.addChild(particle);
        particles.push(particle);
    }
}

/**
 * Updates active particle animations.
 * Called directly by the game loop.
 * @param {number} delta - Time elapsed since the last frame (usually from ticker.deltaTime).
 */
export function updateParticles(delta) {
    if (!particleContainer) return;
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        // @ts-ignore - Access custom properties
        particle.x += particle.vx * delta;
        // @ts-ignore
        particle.y += particle.vy * delta;
        // @ts-ignore
        particle.life -= delta / 60; // Assuming delta is based on 60fps
        // @ts-ignore
        particle.vy += 0.1 * delta; // Gravity

        // @ts-ignore
        if (particle.life <= 0 || particle.y > GAME_HEIGHT + 20) {
            particle.destroy();
            particles.splice(i, 1);
        } else {
             // @ts-ignore - Fade out towards end of life
            particle.alpha = Math.max(0, particle.life);
        }
    }
}

// TODO (Phase 2/3): Add destroy function to clean up intervals, containers?, particles?
