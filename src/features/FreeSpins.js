import { FREE_SPINS_AWARDED, freeSpinsBgColor, normalBgColor } from '../config/gameSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { state, updateState } from '../core/GameState.js'; // Assuming state management
import { showOverlayMessage } from '../ui/Notifications.js'; // Assuming notification handling
import { setButtonsEnabled, updateAutoplayButtonState, updateDisplays } from '../ui/UIManager.js'; // Import updateDisplays
import { startSpin } from '../ui/ButtonHandlers.js'; // Assuming spin initiation
import { gsap } from 'gsap'; // Import GSAP for animations
import { PixiPlugin } from 'gsap/PixiPlugin'; // Import PixiPlugin
import * as PIXI from 'pixi.js'; // Import Pixi.js

// Register the PixiPlugin
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI); // Link PixiPlugin to the PIXI instance

// Reference to the Pixi app (needed for background color change)
/** @type {PIXI.Application | null} */
let app = null;
/** @type {PIXI.Container | null} */
let reelsContainer = null;
/** @type {Array<import('../core/Reel.js').Reel>} */
let reels = [];

// Free Spins state tracking
let freeSpinsRemaining = 0;
let freeSpinsTotalWin = 0;
const FREE_SPINS_MULTIPLIER = 2; // Multiplier for free spins wins

// Container for special animations during free spins
/** @type {PIXI.Container | null} */
let specialAnimationsContainer = null;

/**
 * Initialize the free spins module
 * @param {PIXI.Application} pixiApp - Reference to the PIXI Application
 * @param {PIXI.Container} reelsContainerRef - Reference to the reels container
 * @param {Array<import('../core/Reel.js').Reel>} reelsRef - Array of reels
 * @param {PIXI.Container} effectsLayer - The dedicated layer for full-screen effects
 */
export function initFreeSpins(pixiApp, reelsContainerRef, reelsRef, effectsLayer) {
    app = pixiApp;
    reelsContainer = reelsContainerRef;
    reels = reelsRef;

    // Create container for special animations
    if (app) { // Null check for app
        specialAnimationsContainer = new PIXI.Container();
        specialAnimationsContainer.name = "FS Special Animations"; // Add a name for debugging

        // Add the container to the dedicated effects layer instead of the main stage
        if (effectsLayer) { // Add null check for safety
            effectsLayer.addChild(specialAnimationsContainer);
        } else {
            console.error("FreeSpins Init Error: Full Screen Effects layer was not provided. Animation may not display correctly.");
            // As a fallback, could add to stage, but layering won't be guaranteed
            // app.stage.addChild(specialAnimationsContainer);
        }
    }
}

/**
 * Enters the Free Spins mode.
 * Updates state, shows message, changes background, and starts the first free spin.
 * @param {number} spinsAwarded - Number of free spins to award (defaults to FREE_SPINS_AWARDED)
 */
export function enterFreeSpins(spinsAwarded = FREE_SPINS_AWARDED) {
    const isRetrigger = state.isInFreeSpins;
    let message = "";
    console.log("!!! Entering Free Spins - State:", state.isInFreeSpins);

    if (isRetrigger) {
        console.log(`Retriggering Free Spins! Adding ${spinsAwarded} more spins.`);
        freeSpinsRemaining = state.freeSpinsRemaining + spinsAwarded;
        // Keep existing total win
        updateState({
            freeSpinsRemaining: freeSpinsRemaining
        });
        message = `${spinsAwarded} EXTRA FREE SPINS!`;

        // Show retrigger message immediately and update display
        showOverlayMessage(message, 2500, () => {
            updateDisplays(); // Update the counter immediately
            // No need to start spin here, it continues from handleFreeSpinEnd
        });

    } else {
        console.log(`Entering Free Spins mode with ${spinsAwarded} spins`);
        freeSpinsRemaining = spinsAwarded;
        freeSpinsTotalWin = 0; // Reset total win only on initial entry

        // Update game state for initial entry
        console.log("[StateChange] Setting isInFreeSpins = true in enterFreeSpins"); // Log state change
        updateState({
            isInFreeSpins: true,
            freeSpinsRemaining: freeSpinsRemaining,
            totalFreeSpinsWin: 0
        });
        message = `${spinsAwarded} FREE SPINS AWARDED!`;

        // Change background color with animation only on initial entry
        if (app && app.renderer) {
            gsap.to(app.renderer, {
                duration: 1.5,
                pixi: { backgroundColor: freeSpinsBgColor }, // Use PixiPlugin syntax
                ease: "power2.inOut"
            });
        }

        // Play entry animation and show message only on initial entry
        playFreeSpinsEntryAnimation(() => {
            // Callback after animation completes
            showOverlayMessage(message, 3000, () => {
                // Update UI elements
                updateDisplays();
                // Disable regular buttons since we're in auto mode
                setButtonsEnabled(false);
                // Start the first free spin automatically after the message
                setTimeout(() => {
                    startFreeSpin();
                }, 500);
            });
        });
    }
}

/**
 * Plays special entry animation for free spins
 * @param {Function} [onComplete] - Optional callback when animation completes
 */
function playFreeSpinsEntryAnimation(onComplete = () => {}) {
    updateState({ isTransitioning: true }); // Prevent actions during transition
    setButtonsEnabled(false); // Disable controls during animation

    // Create animation elements if container exists - Added null check for container
    if (specialAnimationsContainer && app) {
        // Clear previous animations
        specialAnimationsContainer.removeChildren();

        // Create text styles
        const titleStyle = new PIXI.TextStyle({
            fontFamily: 'Impact, Charcoal, sans-serif',
            fontSize: 100,
            fontWeight: 'bold',
            fill: 0xFFD700, // Single gold color as hex number
            stroke: { color: 0x000000, width: 5 },
            dropShadow: { color: 0x000000, alpha: 0.7, blur: 5, distance: 3 },
            align: 'center'
        });

        // Create title text
        const title = new PIXI.Text("FREE SPINS", titleStyle);
        title.anchor.set(0.5);
        title.x = app.screen.width / 2;
        title.y = app.screen.height / 2;
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
        shine.rotation = Math.PI / 4; // 45 degrees
        shine.x = -title.width;
        shine.y = app.screen.height / 2;
        shine.visible = false;
        specialAnimationsContainer.addChild(shine);

        // Animation sequence
        const tl = gsap.timeline({
            onComplete: () => {
                // Clean up animation elements - Added null check
                if (specialAnimationsContainer) {
                    specialAnimationsContainer.removeChildren();
                }
                // Reset transitioning state BEFORE calling the next step
                updateState({ isTransitioning: false });
                onComplete(); // Call the original callback (which shows the message)
            }
        });

        // Zoom in animation with bounce
        tl.to(title, {
            alpha: 1,
            scale: 1.2,
            duration: 0.5,
            ease: "back.out(1.7)"
        });

        // Add shine sweep effect
        tl.to(shine, {
            x: app.screen.width + 100,
            duration: 0.8,
            onStart: () => { shine.visible = true; },
            onComplete: () => { shine.visible = false; }
        }, "-=0.2");

        // Shrink and fade out
        tl.to(title, {
            scale: 0.8,
            alpha: 0,
            y: app.screen.height / 2 - 80,
            duration: 0.4,
            delay: 0.3
        });
    } else {
        // Fall back to simpler transition if container not available
        console.warn("FreeSpins: specialAnimationsContainer not initialized, skipping entry animation."); // Added warning
        setTimeout(() => {
            // Ensure state is reset even if animation is skipped
            updateState({ isTransitioning: false });
            onComplete(); // Call original callback
        }, 500); // Shorter delay if no animation
    }
}

/**
 * Initiates a single free spin if conditions are met.
 */
function startFreeSpin() {
    console.log("Attempting to start free spin:", {
        isInFreeSpins: state.isInFreeSpins,
        freeSpinsRemaining: state.freeSpinsRemaining,
        isSpinning: state.isSpinning,
        isTransitioning: state.isTransitioning
    });

    if (!state.isInFreeSpins) {
        console.error("Cannot start free spin: Not in free spins mode");
        return;
    }

    if (state.freeSpinsRemaining <= 0) {
        console.error("Cannot start free spin: No free spins remaining");
        return;
    }

    if (state.isSpinning) {
        console.error("Cannot start free spin: Already spinning");
        return;
    }

    if (state.isTransitioning) {
        console.error("Cannot start free spin: Game is in transition");
        return;
    }

    // Update UI to reflect current free spins state
    updateDisplays();

    // Ensure buttons remain disabled during free spins
    setButtonsEnabled(false);

    console.log("Starting free spin #" + (FREE_SPINS_AWARDED - state.freeSpinsRemaining + 1));

    // Call the main startSpin function, flagging it as a free spin
    startSpin(true);
}

/**
 * Exits the Free Spins mode.
 * Shows summary message, resets state, changes background back.
 */
export function exitFreeSpins() {
    if (!state.isInFreeSpins || !app) return;

    console.log(`Exit Free Spins. Total Win: €${state.totalFreeSpinsWin.toFixed(2)}`);
    updateState({ isTransitioning: true }); // Prevent actions during transition

    // Animate background color back to normal using PixiPlugin
    if (app.renderer) { // No need to check app.renderer.background
        gsap.to(app.renderer, {
            duration: 1,
            pixi: { backgroundColor: normalBgColor }, // Use PixiPlugin syntax
            ease: "power1.inOut", // Smoother ease out
            // onUpdate removed as PixiPlugin handles it
        });
    }

    // Show summary message
    const winText = state.totalFreeSpinsWin > 0 ?
        `FREE SPINS COMPLETE\nTOTAL WIN:\n€${state.totalFreeSpinsWin.toFixed(2)}` :
        `FREE SPINS COMPLETE\nBETTER LUCK NEXT TIME!`;

    showOverlayMessage(
        winText,
        state.totalFreeSpinsWin > 0 ? 3000 : 2000, // Longer display for big wins
        () => {
            // Reset state AFTER the message
            console.log("[StateChange] Setting isInFreeSpins = false in exitFreeSpins callback"); // Log state change
            updateState({
                isInFreeSpins: false,
                freeSpinsRemaining: 0,
                isTransitioning: false,
            });

            // Update UI to remove free spins indicators
            updateDisplays();

            // Re-enable controls
            setButtonsEnabled(true);
        }
    );
}

/**
 * Handles the logic after a free spin completes.
 * Updates total win, decrements remaining spins, and decides whether to start next spin or exit.
 */
export function handleFreeSpinEnd() { // Ensure this is exported
    console.log("handleFreeSpinEnd called with state:", {
        isInFreeSpins: state.isInFreeSpins,
        freeSpinsRemaining: state.freeSpinsRemaining,
        lastTotalWin: state.lastTotalWin
    });

    if (!state.isInFreeSpins) {
        console.error("handleFreeSpinEnd: Not in free spins mode");
        return;
    }

    console.log(`Free spin completed. Spins remaining: ${state.freeSpinsRemaining - 1}`);

    // Apply multiplier to the win and add to total
    const multipliedWin = state.lastTotalWin * FREE_SPINS_MULTIPLIER;
    const totalWin = state.totalFreeSpinsWin + multipliedWin;

    console.log(`Win: ${state.lastTotalWin} x ${FREE_SPINS_MULTIPLIER} = ${multipliedWin}, Total: ${totalWin}`);

    // Update state with multiplied win
    updateState({
        totalFreeSpinsWin: totalWin,
        freeSpinsRemaining: state.freeSpinsRemaining - 1
    });

    // Update UI to show current free spins state
    updateDisplays();

    // Delay before next action (next spin or exit)
    const delay = (state.isTurboMode ? 200 : 800) * winAnimDelayMultiplier;
    updateState({ isTransitioning: true });

    console.log(`Scheduling next action in ${delay}ms...`);

    setTimeout(() => {
        updateState({ isTransitioning: false });

        if (state.freeSpinsRemaining > 0) {
            console.log(`Starting next free spin. Remaining: ${state.freeSpinsRemaining}`);
            startFreeSpin(); // Start the next free spin
        } else {
            console.log("No more free spins remaining. Exiting free spins mode.");
            exitFreeSpins(); // No spins left, exit the mode
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
