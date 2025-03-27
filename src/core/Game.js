import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
// Import animation settings
import {
    // stopDelayBase, // No longer used directly here
    winAnimDelayMultiplier, // Still used in handleSpinEnd
    REEL_STOP_STAGGER, baseSpinDuration, stopTweenDuration, // Normal settings
    turboBaseSpinDuration, turboReelStopStagger // Turbo settings
} from '../config/animationSettings.js';
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
            // Ensure app and canvas exist before appending
            if (app?.canvas && this.canvasContainer) {
                this.canvasContainer.appendChild(app.canvas);
            } else {
                throw new Error("Pixi Application or canvas could not be initialized.");
            }

            // --- Initialize Core Modules ---
            initFreeSpins(app); // Pass app reference for background changes

            // --- Create Main Containers ---
            reelContainer = new PIXI.Container();
            reelContainer.x = SETTINGS.reelAreaX;
            reelContainer.y = SETTINGS.reelAreaY;
            // Ensure app and stage exist before adding children
            if (!app?.stage) throw new Error("Pixi stage not available after init.");
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
            if (app?.stage) { // Check again before adding mask
               app.stage.addChild(reelMask); // Mask needs to be added to stage
            }

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
            // Ensure app and ticker exist before adding update loop
            if (app?.ticker) {
                app.ticker.add(this.update.bind(this)); // Add bound update method to ticker
            } else {
                 throw new Error("Pixi ticker not available after init.");
            }

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
             // Use a single color for fill as PixiJS expects
             fill: 0xffd700, // Gold color
             stroke: { color: "#8B0000", width: 3 },
             dropShadow: { color: "#000000", distance: 4, blur: 4, angle: Math.PI / 4, alpha: 0.7 }
            };
        const titleText = new PIXI.Text({ text: "HEAVENS TEN", style: titleStyle });
        titleText.anchor.set(0.5, 0);
        titleText.x = SETTINGS.GAME_WIDTH / 2;
        titleText.y = 15;
        // Ensure app and stage exist before adding title
        if (app && app.stage) { // More explicit check
            app.stage.addChild(titleText); // Add title directly to stage
        }

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

        // Spin Button (Circular with Icon)
        // Note: Text '↻' and textStyle are now ignored due to iconType='spin'
        createButton("↻", SETTINGS.GAME_WIDTH - 75, SETTINGS.GAME_HEIGHT / 2 + 50, handlers.startSpin, {}, uiContainer, 80, 80, true, 'spin').name = "spinButton";

        // Turbo Button
        createButton("⚡", 90 + 20, bottomUIY + 55, handlers.toggleTurbo, buttonTextStyle, uiContainer, btnW, btnH).name = "turboButton";

        // Autoplay Button
        createButton("▶", 150 + 20, bottomUIY + 55, handlers.toggleAutoplay, buttonTextStyle, uiContainer, btnW, btnH).name = "autoplayButton";

        // Placeholder/Inactive Buttons
        createButton("$", SETTINGS.GAME_WIDTH - 75, SETTINGS.GAME_HEIGHT / 2 - 50, () => {}, buttonTextStyle, uiContainer, 60, 60, true).alpha = 0.3;
        createButton("☰", SETTINGS.GAME_WIDTH - 55, 20 + 20, () => {}, buttonTextStyle, uiContainer, btnW, btnH).alpha = 0.3;
        // Removed overlapping 'X' button: createButton("X", 30 + 20, bottomUIY + 55, () => {}, buttonTextStyle, uiContainer, btnW, btnH).alpha = 0.3;

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
            // Ensure app and ticker exist before stopping
            if (app?.ticker) {
                app.ticker.stop(); // Stop the loop on critical error
            }
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

    // Get current time to calculate absolute stop times
    // Note: app.ticker.lastTime might be more accurate if available globally or passed in
    const startTime = performance.now();

    // Start all reels spinning and schedule their stops
    reels.forEach((reel, i) => {
        reel.startSpinning(isTurbo); // Start spinning visually

        // Calculate the absolute time this reel should come to a complete stop
        // Select duration and stagger based on turbo state
        const currentBaseDuration = state.isTurboMode ? turboBaseSpinDuration : baseSpinDuration;
        const currentStagger = state.isTurboMode ? turboReelStopStagger : REEL_STOP_STAGGER;

        const targetStopTime = startTime + currentBaseDuration + i * currentStagger;

        // Tell the reel when to stop and which index to target
        // (stopIndex is determined internally by the reel in startSpinning for now)
        reel.scheduleStop(targetStopTime);
        console.log(`Game: Reel ${i} scheduled to stop at ${targetStopTime.toFixed(0)}ms`);
    });

    // No need for targetStoppingReelIndex or setTimeout for initiation
    updateState({ targetStoppingReelIndex: -1 });
}

// Removed triggerNextReelStop function as it's no longer needed
// Removed old initiateStop logic using setTimeout
