import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
import { stopDelayBase, winAnimDelayMultiplier } from '../config/animationSettings.js'; // Import necessary settings
import { state, updateState, initGameState } from './GameState.js';
import { Reel } from './Reel.js';
import { createButton } from '../ui/ButtonFactory.js';
import * as handlers from '../ui/ButtonHandlers.js';
import { initInfoOverlay, updateInfoOverlay } from '../ui/InfoOverlay.js';
import { initNotifications } from '../ui/Notifications.js'; // init only
import { initWinEvaluation, evaluateWin } from '../features/WinEvaluation.js';
import { initPaylineGraphics, clearWinLines } from '../features/PaylineGraphics.js'; // Import clearWinLines here
import { initFreeSpins } from '../features/FreeSpins.js';
import { initTurboMode, applyTurboSettings } from '../features/TurboMode.js';
import { initAnimations, updateParticles } from '../features/Animations.js'; // Import updateParticles here
import { initUIManager, updateDisplays, setButtonsEnabled } from '../ui/UIManager.js'; // Assuming UIManager exists
import { handleAutoplayNextSpin } from '../features/Autoplay.js';

// --- Module-level variables ---
let app = null;
let reels = [];
let reelContainer, uiContainer, winLineGraphics, overlayContainer, particleContainer;
let infoOverlayElement; // DOM element reference

// --- Game Class ---
export class Game {
    constructor(canvasContainerId) {
        this.canvasContainer = document.getElementById(canvasContainerId);
        if (!this.canvasContainer) {
            console.error(`Game Error: Canvas container #${canvasContainerId} not found.`);
            return;
        }
        // Initialize game state with default values
        initGameState();
    }

    async init() {
        try {
            // --- PixiJS App Setup ---
            app = new PIXI.Application();
            await app.init({
                width: SETTINGS.GAME_WIDTH,
                height: SETTINGS.GAME_HEIGHT,
                backgroundColor: SETTINGS.normalBgColor,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });
            this.canvasContainer.appendChild(app.canvas);

            // --- Initialize Core Modules ---
            initFreeSpins(app); // Pass app reference for background changes

            // --- Create Main Containers ---
            reelContainer = new PIXI.Container();
            reelContainer.x = SETTINGS.reelAreaX;
            reelContainer.y = SETTINGS.reelAreaY;
            app.stage.addChild(reelContainer);

            uiContainer = new PIXI.Container();
            app.stage.addChild(uiContainer); // Add UI container first? Or last? Check layering.

            winLineGraphics = new PIXI.Graphics();
            // Position set in initPaylineGraphics
            app.stage.addChild(winLineGraphics);

            overlayContainer = new PIXI.Container(); // For win messages, etc.
            app.stage.addChild(overlayContainer);

            particleContainer = new PIXI.Container(); // For particle effects
            app.stage.addChild(particleContainer);

            // --- Initialize Feature/UI Modules with Containers ---
            initPaylineGraphics(winLineGraphics);
            initNotifications(overlayContainer); // Pass overlay container
            initAnimations(overlayContainer, particleContainer); // Pass relevant containers
            initTurboMode(reels); // Pass reels array reference

            // --- Create Reels ---
            for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
                const reel = new Reel(i, REEL_STRIPS[i], app.ticker);
                reels.push(reel);
                reelContainer.addChild(reel.container);
            }
            initWinEvaluation(reels); // Pass reels array reference

            // --- Reel Mask ---
            const reelMask = new PIXI.Graphics()
                .rect(SETTINGS.reelAreaX, SETTINGS.reelAreaY, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
                .fill(0xffffff);
            reelContainer.mask = reelMask;
            app.stage.addChild(reelMask); // Mask needs to be added to stage

            // --- Setup UI ---
            this.setupUI(); // Call UI setup method

            // --- Initialize Info Overlay (DOM) ---
            infoOverlayElement = document.getElementById('infoOverlay'); // Get DOM element
            if (infoOverlayElement) {
                initInfoOverlay(infoOverlayElement); // Initialize the module
                updateInfoOverlay(); // Initial update
            } else {
                console.warn("Game Setup: infoOverlay element not found in DOM.");
            }

            // --- Final Setup ---
            updateDisplays(); // Initial UI text update
            setButtonsEnabled(true); // Enable buttons initially
            applyTurboSettings(state.isTurboMode); // Apply initial turbo settings

            // --- Start Game Loop ---
            app.ticker.add(this.update.bind(this)); // Add bound update method to ticker

            console.log("Game Initialized Successfully");

        } catch (err) {
            console.error("PixiJS or Game Init Failed:", err);
            this.canvasContainer.innerHTML = `Error initializing graphics: ${err.message}. Check console.`;
        }
    }

    setupUI() {
        // --- Title ---
        const titleStyle = {
             fontFamily: "Impact, Charcoal, sans-serif",
             fontSize: 40,
             // Define gradient fill explicitly
             fill: {
                 gradient: 'linear', // Type of gradient
                 stops: [ // Array of color stops
                     { offset: 0, color: 0xffd700 }, // Gold
                     { offset: 1, color: 0xf1c40f }  // Lighter gold/orange
                 ],
                 // Optional: angle, stops etc. Default is vertical.
             },
             stroke: { color: "#8B0000", width: 3 },
             dropShadow: { color: "#000000", distance: 4, blur: 4, angle: Math.PI / 4, alpha: 0.7 }
            };
        const titleText = new PIXI.Text({ text: "HEAVENS TEN", style: titleStyle });
        titleText.anchor.set(0.5, 0);
        titleText.x = SETTINGS.GAME_WIDTH / 2;
        titleText.y = 15;
        app.stage.addChild(titleText); // Add title directly to stage

        // --- UI Panel ---
        const panelHeight = 100;
        const panel = new PIXI.Graphics()
            .rect(0, SETTINGS.GAME_HEIGHT - panelHeight, SETTINGS.GAME_WIDTH, panelHeight)
            .fill({ color: 0x1a1a1a, alpha: 0.8 });
        uiContainer.addChild(panel);

        // --- Text Styles ---
        const uiTextStyle = { fontFamily: "Arial, sans-serif", fontSize: 18, fill: 0xdddddd };
        const uiValueStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } };
        const buttonTextStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 20, fill: 0xffffff };

        // --- Create UI Elements (using UIManager) ---
        // UIManager should handle creation and storing references
        initUIManager(uiContainer, uiTextStyle, uiValueStyle);

        // --- Create Buttons (using ButtonFactory and handlers) ---
        const bottomUIY = SETTINGS.bottomUIY;
        const btnW = 40, btnH = 40; // Common button size

        // Bet Buttons
        createButton("-", SETTINGS.GAME_WIDTH - 200, bottomUIY + 55, handlers.decreaseBet, buttonTextStyle, uiContainer, btnW, btnH).name = "betDecreaseButton";
        createButton("+", SETTINGS.GAME_WIDTH - 140, bottomUIY + 55, handlers.increaseBet, buttonTextStyle, uiContainer, btnW, btnH).name = "betIncreaseButton";

        // Spin Button
        createButton("↻", SETTINGS.GAME_WIDTH - 75, SETTINGS.GAME_HEIGHT / 2 + 50, handlers.startSpin, { ...buttonTextStyle, fontSize: 40 }, uiContainer, 80, 80, true).name = "spinButton";

        // Turbo Button
        createButton("⚡", 90 + 20, bottomUIY + 55, handlers.toggleTurbo, buttonTextStyle, uiContainer, btnW, btnH).name = "turboButton";

        // Autoplay Button
        createButton("▶", 150 + 20, bottomUIY + 55, handlers.toggleAutoplay, buttonTextStyle, uiContainer, btnW, btnH).name = "autoplayButton";

        // Placeholder/Inactive Buttons
        createButton("$", SETTINGS.GAME_WIDTH - 75, SETTINGS.GAME_HEIGHT / 2 - 50, () => {}, buttonTextStyle, uiContainer, 60, 60, true).alpha = 0.3;
        createButton("☰", SETTINGS.GAME_WIDTH - 55, 20 + 20, () => {}, buttonTextStyle, uiContainer, btnW, btnH).alpha = 0.3;
        createButton("X", 30 + 20, bottomUIY + 55, () => {}, buttonTextStyle, uiContainer, btnW, btnH).alpha = 0.3;

        // Add all created buttons from ButtonFactory to the uiContainer
        // (ButtonFactory now returns the button, it doesn't add it)
        // We need a way to get references to buttons created by createButton if UIManager needs them.
        // Option 1: createButton adds to uiContainer (simpler now)
        // Option 2: Game collects buttons and passes to UIManager (more complex)
        // Let's modify ButtonFactory to add to uiContainer for now.
        // --> Requires reading/modifying ButtonFactory.js again. Let's do that *after* this file.

    }

    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        try {
            // Update all reels
            reels.forEach(reel => {
                const isActive = reel.update(delta, now);
                if (isActive) {
                    anyReelMoving = true;
                }
            });

            // Update particle animations
            updateParticles(delta);

            // Check if the spin has just ended
            if (state.isSpinning && !anyReelMoving) {
                this.handleSpinEnd();
            }

        } catch (err) {
            console.error("Error in game loop:", err);
            app.ticker.stop(); // Stop the loop on critical error
            alert("Game loop critical error. Check console.");
        }
    }

    handleSpinEnd() {
        updateState({ isSpinning: false, isTransitioning: true }); // Mark as transitioning
        console.log("All reels stopped moving (final check).");

        // Short delay before evaluating wins to allow final animations/settling
        setTimeout(() => {
            console.log("Evaluating wins...");
            evaluateWin(); // Evaluate wins (updates state.lastTotalWin, etc.)

            updateState({ isTransitioning: false }); // End transition after evaluation

            // Check game state to decide next action
            if (state.isInFreeSpins) {
                // handleFreeSpinEnd will decide if another FS starts or exits
                // handleFreeSpinEnd(); // This is called within evaluateWin if FS trigger happens? No, called after eval.
                // --> Need to import and call handleFreeSpinEnd from FreeSpins.js
                // --> Let's assume evaluateWin handles the FS trigger, and we call handleFreeSpinEnd *after* eval if in FS.
                 import('../features/FreeSpins.js').then(fs => fs.handleFreeSpinEnd()); // Dynamic import to avoid circular dependency? Or pass function ref.
            } else if (state.isAutoplaying) {
                handleAutoplayNextSpin(); // Check if next autoplay spin should start
            } else {
                setButtonsEnabled(true); // Re-enable buttons for manual play
            }
        }, 50 * winAnimDelayMultiplier); // Use animation multiplier for delay
    }
}

// --- Global Functions used by other modules ---

/**
 * Starts the spinning process for all reels.
 * Called by ButtonHandlers.startSpin.
 */
export function startSpinLoop(isTurbo) {
    // Clear previous win lines before starting spin
    clearWinLines();

    reels.forEach(reel => reel.startSpinning(isTurbo));

    // Schedule the first reel stop
    const currentStopDelayBase = state.isTurboMode ? 100 : stopDelayBase; // Use state value
    setTimeout(() => {
        if (state.isSpinning && state.targetStoppingReelIndex === 0 && reels.length > 0) {
            reels[0].initiateStop(); // Tell the first reel to start stopping
        }
    }, currentStopDelayBase);
}

/**
 * Triggers the stop sequence for the next reel in the chain.
 * Called by a Reel instance when it finishes stopping.
 */
export function triggerNextReelStop(stoppedReelIndex) {
    // Only proceed if the reel that just stopped was the one we were waiting for
    if (stoppedReelIndex === state.targetStoppingReelIndex) {
        const nextReelIndex = stoppedReelIndex + 1;

        if (nextReelIndex < SETTINGS.NUM_REELS) {
            const nextReel = reels[nextReelIndex];
            if (nextReel) {
                 // Update the target index BEFORE initiating stop
                updateState({ targetStoppingReelIndex: nextReelIndex });
                nextReel.initiateStop(); // Initiate stop sequence for the next reel
                console.log(`Game: Triggering stop for reel ${nextReelIndex}`);
            } else {
                 console.error(`Game: Reel ${nextReelIndex} not found.`);
                 updateState({ targetStoppingReelIndex: -1 }); // Error state, reset?
            }
        } else {
            // The last reel just stopped
            updateState({ targetStoppingReelIndex: -1 }); // Reset target index
            console.log("Game: Last reel stop triggered.");
            // The game loop's check for !anyReelMoving will handle calling evaluateWin
        }
    } else {
         console.warn(`Game: Reel ${stoppedReelIndex} stopped, but waiting for ${state.targetStoppingReelIndex}. Ignoring.`);
    }
}
