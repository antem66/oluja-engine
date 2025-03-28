import { FREE_SPINS_AWARDED, freeSpinsBgColor, normalBgColor } from '../config/gameSettings.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { state, updateState } from '../core/GameState.js'; // Assuming state management
import { showOverlayMessage } from '../ui/Notifications.js'; // Assuming notification handling
import { setButtonsEnabled, updateAutoplayButtonState, updateDisplays } from '../ui/UIManager.js'; // Import updateDisplays
import { startSpin } from '../ui/ButtonHandlers.js'; // Assuming spin initiation
import { gsap } from 'gsap'; // Import GSAP for animations
import * as PIXI from 'pixi.js'; // Import Pixi.js

// Reference to the Pixi app (needed for background color change)
let app = null;
let reelsContainer = null;
let reels = [];

// Free Spins state tracking
let freeSpinsRemaining = 0;
let freeSpinsTotalWin = 0;
const FREE_SPINS_MULTIPLIER = 2; // Multiplier for free spins wins

// Container for special animations during free spins
let specialAnimationsContainer = null;

/**
 * Initialize the free spins module
 * @param {PIXI.Application} pixiApp - Reference to the PIXI Application
 * @param {PIXI.Container} reelsContainerRef - Reference to the reels container
 * @param {Array} reelsRef - Array of reels
 */
export function initFreeSpins(pixiApp, reelsContainerRef, reelsRef) {
    app = pixiApp;
    reelsContainer = reelsContainerRef;
    reels = reelsRef;

    // Create container for special animations
    specialAnimationsContainer = new PIXI.Container();
    app.stage.addChild(specialAnimationsContainer);
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

    // IMMEDIATE STATE UPDATE: Set isInFreeSpins true first to make UI respond faster
    updateState({ 
        isInFreeSpins: true,
        isTransitioning: false // Allow indicator to show immediately
    });

    if (isRetrigger) {
        console.log(`Retriggering Free Spins! Adding ${spinsAwarded} more spins.`);
        freeSpinsRemaining = state.freeSpinsRemaining + spinsAwarded;
        // Keep existing total win
        updateState({
            isInFreeSpins: true, // Ensure flag is set
            freeSpinsRemaining: freeSpinsRemaining,
            isTransitioning: false // Allow indicator to show immediately
        });
        message = `${spinsAwarded} EXTRA FREE SPINS!`;

        // Show retrigger message immediately and update display
        showOverlayMessage(message, 2500, () => {
            updateDisplays(); // Update the counter immediately
            // Block other UI changes during transitioning
            updateState({ isTransitioning: true });
            
            setTimeout(() => {
                updateState({ isTransitioning: false });
                // No need to start spin here, it continues from handleFreeSpinEnd
            }, 300);
        });

    } else {
        console.log(`Entering Free Spins mode with ${spinsAwarded} spins`);
        freeSpinsRemaining = spinsAwarded;
        freeSpinsTotalWin = 0; // Reset total win only on initial entry

        // Update game state for initial entry - keep transitioning false so indicator shows
        console.log("[StateChange] Setting isInFreeSpins = true in enterFreeSpins"); // Log state change
        updateState({
            isInFreeSpins: true,
            freeSpinsRemaining: freeSpinsRemaining,
            totalFreeSpinsWin: 0,
            isTransitioning: false // Allow indicator to show immediately
        });
        message = `${spinsAwarded} FREE SPINS AWARDED!`;

        // Change background color with animation only on initial entry
        if (app && app.renderer) {
            gsap.to(app.renderer, {
                duration: 1.5,
                backgroundColor: freeSpinsBgColor,
                ease: "power2.inOut"
            });
        }

        // Now that indicator should be visible, we can transition to entry animation
        // Delay briefly to ensure indicator has time to appear
        setTimeout(() => {
            // Now set transitioning state for the entry animation
            updateState({ isTransitioning: true });
            
            playFreeSpinsEntryAnimation(() => {
                // Callback after animation completes
                showOverlayMessage(message, 3000, () => {
                    // Update UI elements
                    updateDisplays();
                    // Disable regular buttons since we're in auto mode
                    setButtonsEnabled(false);
                    // Clear transitioning state before starting first spin
                    updateState({ isTransitioning: false });
                    // Start the first free spin automatically after the message
                    setTimeout(() => {
                        startFreeSpin();
                    }, 500);
                });
            });
        }, 300); // Brief delay to let indicator appear
    }
}

/**
 * Plays special entry animation for free spins
 * @param {Function} [onComplete] - Optional callback when animation completes
 */
function playFreeSpinsEntryAnimation(onComplete = () => {}) {
    updateState({ isTransitioning: true }); // Prevent actions during transition
    setButtonsEnabled(false); // Disable controls during animation

    // Create animation elements if container exists
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
                // Clean up animation elements
                specialAnimationsContainer.removeChildren();
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
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 1000);
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
    
    // Explicitly set isTransitioning to true to prevent UI flicker during exit
    updateState({ 
        isTransitioning: true,
        isInFreeSpins: true  // Keep free spins active until fully exited
    });

    // Animate background color back to normal
    if (app.renderer && app.renderer.background) {
        const originalColor = app.renderer.background.color || freeSpinsBgColor;

        // Animate background color change
        const colorObj = { value: originalColor };
        gsap.to(colorObj, {
            value: normalBgColor,
            duration: 1,
            onUpdate: () => {
                app.renderer.background.color = Math.round(colorObj.value);
            }
        });
    }

    // Show summary message
    const winText = state.totalFreeSpinsWin > 0 ?
        `FREE SPINS COMPLETE\nTOTAL WIN:\n€${state.totalFreeSpinsWin.toFixed(2)}` :
        `FREE SPINS COMPLETE\nBETTER LUCK NEXT TIME!`;

    // Increased message display time for better visibility
    const messageTime = state.totalFreeSpinsWin > 0 ? 4000 : 3000;
    
    showOverlayMessage(
        winText,
        messageTime,
        () => {
            // Reset state AFTER the message
            console.log("[StateChange] Setting isInFreeSpins = false in exitFreeSpins callback");
            
            // Set a small delay before fully exiting to ensure UI has time to update
            setTimeout(() => {
                updateState({
                    isInFreeSpins: false,
                    freeSpinsRemaining: 0,
                    isTransitioning: false,
                });
                
                // Update UI to remove free spins indicators
                updateDisplays();
                
                // Re-enable controls
                setButtonsEnabled(true);
            }, 300);
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

    // Ensure we stay in free spins mode by confirming the state
    updateState({
        isInFreeSpins: true, // Explicitly set to true to ensure consistency
        totalFreeSpinsWin: totalWin,
        freeSpinsRemaining: state.freeSpinsRemaining - 1
    });

    // Update UI to show current free spins state
    updateDisplays();

    // Increased delay to ensure better visual feedback between spins
    const delay = Math.max((state.isTurboMode ? 400 : 1000) * winAnimDelayMultiplier, 500);
    updateState({ isTransitioning: true });

    console.log(`Scheduling next action in ${delay}ms...`);

    setTimeout(() => {
        // Only proceed if we're still in free spins mode
        if (!state.isInFreeSpins) {
            console.warn("Free spins state changed during transition - aborting next action");
            updateState({ isTransitioning: false });
            return;
        }
            
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
