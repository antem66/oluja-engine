import { FREE_SPINS_AWARDED, freeSpinsBgColor, normalBgColor } from '../config/gameSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { gsap } from 'gsap'; // Import GSAP for animations
import { PixiPlugin } from 'gsap/PixiPlugin'; // Import PixiPlugin
import * as PIXI from 'pixi.js'; // Import Pixi.js

// Import Types for Dependencies
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';
import { SpinManager } from '../core/SpinManager.js';
import { AnimationController } from '../core/AnimationController.js';
import { BackgroundManager } from '../core/BackgroundManager.js';
import { state } from '../core/GameState.js'; // Keep temporarily for reading state

// Register the PixiPlugin
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI); // Link PixiPlugin to the PIXI instance

// --- Module-Level Dependencies ---
/** @type {Logger | null} */
let logger = null;
/** @type {EventBus | null} */
let eventBus = null;
/** @type {FeatureManager | null} */
let featureManager = null;
/** @type {SpinManager | null} */
let spinManager = null;
/** @type {AnimationController | null} */
let animationController = null;
/** @type {BackgroundManager | null} */
let backgroundManager = null;
/** @type {Array<Function>} */
let listeners = []; // To store unsubscribe functions

// --- Module-Level State (Temporary - Should ideally be fully managed by GameState via events) ---
// let freeSpinsRemaining = 0; // Read from GameState instead
// let freeSpinsTotalWin = 0; // Read/Update via GameState events
const FREE_SPINS_MULTIPLIER = 2;

// Container for special animations during free spins
/** @type {PIXI.Container | null} */
let specialAnimationsContainer = null; // Keep for now, might move to AnimationController

/**
 * Initialize the free spins module with dependencies.
 * @param {object} dependencies
 * @param {Logger} dependencies.logger
 * @param {EventBus} dependencies.eventBus
 * @param {FeatureManager} dependencies.featureManager
 * @param {SpinManager} dependencies.spinManager
 * @param {AnimationController} dependencies.animationController
 * @param {BackgroundManager} dependencies.backgroundManager
 * @param {PIXI.Container} dependencies.effectsLayer // Keep effectsLayer separate for now
 */
export function initFreeSpins(dependencies) {
    if (!dependencies || !dependencies.logger || !dependencies.eventBus || !dependencies.featureManager || !dependencies.spinManager || !dependencies.animationController || !dependencies.backgroundManager || !dependencies.effectsLayer) {
        console.error("FreeSpins Init Error: Missing dependencies (logger, eventBus, featureManager, spinManager, animationController, backgroundManager, effectsLayer).");
        return;
    }
    logger = dependencies.logger;
    eventBus = dependencies.eventBus;
    featureManager = dependencies.featureManager;
    spinManager = dependencies.spinManager;
    animationController = dependencies.animationController;
    backgroundManager = dependencies.backgroundManager;
    
    // Removed direct app/reels/container assignments

    // Create container for special animations (still needed for GSAP targeting)
    specialAnimationsContainer = new PIXI.Container();
    specialAnimationsContainer.name = "FS Special Animations"; 
    dependencies.effectsLayer.addChild(specialAnimationsContainer);

    // --- Subscribe to Events ---
    // Listen for trigger event (e.g., from WinEvaluation/ResultHandler)
    const unsubTrigger = eventBus.on('freespins:triggered', enterFreeSpins);
    listeners.push(unsubTrigger);

    // Listen for spin end to handle next free spin or exit
    // TODO: Determine correct event: 'reels:stopped' or 'spin:complete'?
    const unsubSpinEnd = eventBus.on('reels:stopped', handleFreeSpinEnd); 
    listeners.push(unsubSpinEnd);

    // TODO: Listen for state changes? (e.g., if FS cancelled externally?)

    logger.info('FreeSpins', 'Initialized and subscribed to events.');
}

/**
 * Cleans up event listeners and animation elements.
 */
export function destroy() {
    listeners.forEach(unsubscribe => unsubscribe());
    listeners = [];
    if (specialAnimationsContainer) {
        specialAnimationsContainer.destroy({ children: true });
        specialAnimationsContainer = null;
    }
    logger?.info('FreeSpins', 'Destroyed and unsubscribed.');
    logger = null;
    eventBus = null;
    featureManager = null;
    spinManager = null;
    animationController = null;
    backgroundManager = null;
}

/**
 * Enters the Free Spins mode. Triggered by 'freespins:triggered' event.
 * Updates state, shows message, changes background, and starts the first free spin.
 * @param {object} eventData - Data from the trigger event.
 * @param {number} [eventData.spinsAwarded=FREE_SPINS_AWARDED] - Number of free spins.
 */
export function enterFreeSpins(eventData = {}) { // Now expects eventData
    const spinsAwarded = eventData.spinsAwarded ?? FREE_SPINS_AWARDED;
    const isRetrigger = state.isInFreeSpins; // Still reading state temporarily
    let message = "";
    logger?.info('FreeSpins', `Entering/Retriggering with ${spinsAwarded} spins. Current state: isInFreeSpins=${isRetrigger}, remaining=${state.freeSpinsRemaining}`);

    if (isRetrigger) {
        const newRemaining = state.freeSpinsRemaining + spinsAwarded;
        // Request state update via event
        eventBus?.emit('state:update', {
            freeSpinsRemaining: newRemaining
        });
        message = `${spinsAwarded} EXTRA FREE SPINS!`;

        // Show retrigger message - Use eventBus to request notification
        eventBus?.emit('notification:show', {
            message: message,
            duration: 2500,
            // No callback needed here, UI updates based on state event
        });
        // No spin start here for retrigger

    } else {
        // Initial Entry
        // Request state update via event
        logger?.debug('FreeSpins', 'Requesting initial Free Spins state update.');
        eventBus?.emit('state:update', {
            isInFreeSpins: true,
            freeSpinsRemaining: spinsAwarded,
            totalFreeSpinsWin: 0 // Reset win on initial entry
        });
        message = `${spinsAwarded} FREE SPINS AWARDED!`;

        // Request background change via BackgroundManager
        backgroundManager?.changeBackground(freeSpinsBgColor, 1.5);

        // Play entry animation via AnimationController or local function?
        // For now, keep local function call, but it needs refactoring
        playFreeSpinsEntryAnimation(() => {
            // Callback after animation completes
            // Request notification display
            eventBus?.emit('notification:show', {
                message: message,
                duration: 3000,
                onComplete: () => { // Use onComplete to schedule first spin
                    // UI updates (like FS counter) should happen automatically via UIManager listening to state:changed
                    // Buttons should be disabled automatically via UIManager listening to state:changed
                    
                    // Start the first free spin automatically after the message
                    // Add small delay before starting spin
                    setTimeout(() => {
                        if (spinManager && state.isInFreeSpins) { // Check state again before starting
                            logger?.info('FreeSpins', 'Starting first free spin.');
                            spinManager.startSpin();
                        } else {
                            logger?.warn('FreeSpins', 'Conditions changed, not starting first spin.');
                        }
                    }, 500); 
                }
            });
        });
    }
}

/**
 * Plays special entry animation for free spins.
 * TODO: Refactor to use AnimationController or register as a standard animation.
 * @param {Function} [onComplete] - Optional callback when animation completes
 */
function playFreeSpinsEntryAnimation(onComplete = () => {}) {
    // Request state update: transitioning = true
    eventBus?.emit('state:update', { isTransitioning: true });
    logger?.debug('FreeSpins', 'Starting entry animation.');

    if (!specialAnimationsContainer || !animationController) {
        logger?.error('FreeSpins', 'Cannot play entry animation - container or animationController missing.');
        eventBus?.emit('state:update', { isTransitioning: false }); // Reset state
        onComplete(); // Call complete immediately
        return;
    }

    // Clear previous animations
    specialAnimationsContainer.removeChildren();

    // Create text styles (Keep local for now)
    const titleStyle = new PIXI.TextStyle({
        fontFamily: 'Impact, Charcoal, sans-serif',
        fontSize: 100,
        fontWeight: 'bold',
        fill: 0xFFD700, 
        stroke: { color: 0x000000, width: 5 },
        dropShadow: { color: 0x000000, alpha: 0.7, blur: 5, distance: 3 },
        align: 'center'
    });

    // Create title text
    const title = new PIXI.Text("FREE SPINS", titleStyle);
    title.anchor.set(0.5);
    // Position relative to screen center (need app dimensions? Use AnimationController context?)
    // For now, assume fixed width/height
    const screenWidth = 1024; // TODO: Get dynamically
    const screenHeight = 768;
    title.x = screenWidth / 2;
    title.y = screenHeight / 2;
    title.alpha = 0;
    title.scale.set(0.5);

    // Add to container
    specialAnimationsContainer.addChild(title);

    // Add shine effect
    const shine = new PIXI.Graphics();
    shine.beginFill(0xFFFFFF);
    shine.drawRect(-50, -title.height * 3, 100, title.height * 6);
    shine.endFill();
    shine.alpha = 0.7;
    shine.rotation = Math.PI / 4;
    shine.x = -title.width;
    shine.y = screenHeight / 2;
    shine.visible = false;
    specialAnimationsContainer.addChild(shine);

    // Animation sequence using GSAP
    const tl = gsap.timeline({
        onComplete: () => {
            if (specialAnimationsContainer) {
                specialAnimationsContainer.removeChildren();
            }
            // Request state update: transitioning = false
            eventBus?.emit('state:update', { isTransitioning: false });
            logger?.debug('FreeSpins', 'Entry animation complete.');
            onComplete(); 
        }
    });

    tl.to(title, {
        alpha: 1,
        scale: 1.2,
        duration: 0.5,
        ease: "back.out(1.7)"
    });

    tl.to(shine, {
        x: screenWidth + 100, // Use dynamic width?
        duration: 0.8,
        onStart: () => { shine.visible = true; },
        onComplete: () => { shine.visible = false; }
    }, "-=0.2");

    // Shrink and fade out
    tl.to(title, {
        scale: 0.8,
        alpha: 0,
        y: screenHeight / 2 - 80,
        duration: 0.4,
        delay: 0.3
    });
}

/**
 * Initiates a single free spin if conditions are met.
 * Called internally after entry animation or previous spin end.
 * @private
 */
function startFreeSpin() {
    // Read current state needed for checks
    const currentRemaining = state.freeSpinsRemaining;
    const currentInFs = state.isInFreeSpins;
    const currentSpinning = state.isSpinning;
    const currentTransitioning = state.isTransitioning;
    
    logger?.debug('FreeSpins', 'Attempting startFreeSpin', { currentInFs, currentRemaining, currentSpinning, currentTransitioning });

    if (!currentInFs || currentRemaining <= 0 || currentSpinning || currentTransitioning) {
        logger?.warn('FreeSpins', 'Conditions not met for starting free spin.');
        // If we shouldn't be spinning but are in FS mode with spins left, maybe try exiting?
        if (currentInFs && currentRemaining <= 0 && !currentSpinning && !currentTransitioning) {
             logger?.info('FreeSpins', 'Auto-triggering exitFreeSpins due to 0 remaining spins.');
             exitFreeSpins();
        }
        return;
    }

    // UI updates (like button state) should happen via UIManager listening to state changes.
    
    logger?.info('FreeSpins', `Starting free spin #${(FREE_SPINS_AWARDED - currentRemaining + 1)}`);

    // Use SpinManager to start the spin
    spinManager?.startSpin(); // Add null check
}

/**
 * Exits the Free Spins mode.
 * Shows summary message, resets state, changes background back.
 */
export function exitFreeSpins() {
    // Read current state
    const currentInFs = state.isInFreeSpins;
    const currentTotalWin = state.totalFreeSpinsWin;
    
    if (!currentInFs) {
         logger?.warn('FreeSpins', 'Attempted to exit Free Spins when not active.');
         return; // Avoid exiting if not in free spins
    }

    logger?.info('FreeSpins', `Exit Free Spins. Total Win: ${currentTotalWin?.toFixed(2)}`);
    // Request state update: transitioning = true
    eventBus?.emit('state:update', { isTransitioning: true }); // Use eventBus

    // Request background change via BackgroundManager
    backgroundManager?.changeBackground(normalBgColor, 1); // Keep this call (method needs adding)

    // Play exit animation? TODO: Create exit animation

    // Show summary message via eventBus
    const winText = currentTotalWin > 0 ?
        `FREE SPINS COMPLETE!\nTOTAL WIN: ${currentTotalWin.toFixed(2)}` :
        `FREE SPINS COMPLETE\nBETTER LUCK NEXT TIME!`;

    eventBus?.emit('notification:show', { // Use eventBus for notification
        message: winText,
        duration: currentTotalWin > 0 ? 3000 : 2000, 
        onComplete: () => {
            // Reset state AFTER the message via eventBus
            logger?.debug('FreeSpins', 'Requesting final state update on exit.');
            eventBus?.emit('state:update', {
                isInFreeSpins: false,
                freeSpinsRemaining: 0,
                // Keep totalFreeSpinsWin as is for history
                isTransitioning: false, // Mark transition complete
            });
            // UI updates (displays, buttons) handled by UIManager listening to state changes
        }
    });
}

/**
 * Handles logic after a free spin completes. Triggered by 'reels:stopped' event.
 * Calculates win, updates state, and schedules next action (spin or exit).
 */
export function handleFreeSpinEnd() { 
    // Ensure we are actually in free spins mode before proceeding
    if (!state.isInFreeSpins) {
        logger?.debug('FreeSpins', 'handleFreeSpinEnd called but not in free spins mode. Ignoring.');
        return;
    }

    logger?.debug('FreeSpins', 'Handling free spin end.');

    // Get the win amount from the last regular spin (before multiplier)
    // This assumes WinEvaluation/ResultHandler has updated state.lastNetWin appropriately
    const lastSpinWin = state.lastNetWin || 0; 
    const winMultiplier = getFreeSpinsMultiplier();
    const effectiveWin = lastSpinWin * winMultiplier;
    const newTotalWin = (state.totalFreeSpinsWin || 0) + effectiveWin;
    const newRemainingSpins = (state.freeSpinsRemaining || 0) - 1;

    // Request state update via eventBus
    eventBus?.emit('state:update', {
        totalFreeSpinsWin: newTotalWin,
        freeSpinsRemaining: newRemainingSpins < 0 ? 0 : newRemainingSpins // Ensure not negative
        // lastNetWin might be reset by ResultHandler/GameState, keep totalFreeSpinsWin separate
    });

    // Delay before next action (next spin or exit)
    // TODO: Use AnimationController to manage delays/sequences?
    const delay = (state.isTurboMode ? 200 : 800) * winAnimDelayMultiplier;
    // Request state update: transitioning = true
    eventBus?.emit('state:update', { isTransitioning: true }); // Use eventBus

    logger?.debug('FreeSpins', `Scheduling next action in ${delay}ms...`);

    setTimeout(() => {
        // Request state update: transitioning = false
        eventBus?.emit('state:update', { isTransitioning: false }); // Use eventBus

        // Read updated remaining spins count AFTER state update
        const remainingSpinsAfterUpdate = state.freeSpinsRemaining;

        if (remainingSpinsAfterUpdate > 0) {
            logger?.info('FreeSpins', `Starting next free spin. Remaining: ${remainingSpinsAfterUpdate}`);
            startFreeSpin(); // Start the next free spin (which uses spinManager)
        } else {
            logger?.info('FreeSpins', 'No more free spins remaining. Exiting free spins mode.');
            exitFreeSpins(); // Trigger the exit sequence
        }
    }, delay);
}

/**
 * Returns the current free spins multiplier for win calculations
 * @returns {number} - The multiplier value
 */
export function getFreeSpinsMultiplier() {
    return state.isInFreeSpins ? FREE_SPINS_MULTIPLIER : 1;
}
