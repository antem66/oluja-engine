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
import { createButton, loadButtonAssets } from '../ui/ButtonFactory.js';
import * as handlers from '../ui/ButtonHandlers.js';
import { initInfoOverlay, updateInfoOverlay } from '../ui/InfoOverlay.js';
import { initNotifications } from '../ui/Notifications.js'; // init only
import { initWinEvaluation, evaluateWin } from '../features/WinEvaluation.js';
import { initPaylineGraphics, clearWinLines } from '../features/PaylineGraphics.js'; // Import clearWinLines here
import { initFreeSpins, handleFreeSpinEnd } from '../features/FreeSpins.js';
import { initTurboMode, applyTurboSettings } from '../features/TurboMode.js';
import { initAnimations, updateParticles } from '../features/Animations.js'; // Import updateParticles here
import { initUIManager, updateDisplays, setButtonsEnabled } from '../ui/UIManager.js'; // Assuming UIManager exists
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations


// --- Module-level variables ---
let app = null;
let reels = [];
let reelContainer, uiContainer, winLineGraphics, overlayContainer, particleContainer;
let infoOverlayElement;

// Free Spins UI Elements (moved from UIManager)
let freeSpinsIndicator = null;
let freeSpinsCountText = null;
let freeSpinsTotalWinText = null;
let freeSpinsGlow = null;


// --- Game Class ---
export class Game {
    backgroundSprite = null; // Ensure no TS type annotation here

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
            // Make this instance accessible to other modules like the debug panel
            if (typeof window !== 'undefined') {
                // @ts-ignore - Dynamically adding gameApp property
                window.gameApp = this;
            }

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

            // --- Asset Loading ---
            // Load symbol assets
            const symbolAssets = SYMBOL_DEFINITIONS.map(def => ({
                alias: def.id, // Use symbol ID as alias
                src: `assets/images/${def.id}.png` // Construct path
            }));

            // Add background image to assets
            symbolAssets.push({
                alias: 'BG_IMAGE',
                src: 'assets/images/background/bg.png'
            });

            console.log("Loading symbol assets:", symbolAssets);
            await PIXI.Assets.load(symbolAssets);
            console.log("Symbol assets loaded.");

            // Load button SVG assets
            console.log("Loading button assets...");
            await loadButtonAssets();

            // --- Initialize Core Modules ---
            initFreeSpins(app, reelContainer, reels); // Pass app, reelContainer and reels references

            // --- Create Main Containers ---
            // Create background layer first (lowest z-index)
            const backgroundLayer = new PIXI.Container();

            // Create the background sprite
            const bgSprite = new PIXI.Sprite(PIXI.Assets.get('BG_IMAGE'));

            // Position the background
            bgSprite.x = SETTINGS.GAME_WIDTH / 2 + SETTINGS.BG_OFFSET_X;
            bgSprite.y = SETTINGS.GAME_HEIGHT / 2 + SETTINGS.BG_OFFSET_Y;

            // Scale based on the configured mode
            let scale = 1;
            if (SETTINGS.BG_SCALE_MODE === 'cover') {
                // Cover mode: ensure image covers the entire game area
                const scaleX = SETTINGS.GAME_WIDTH / bgSprite.width;
                const scaleY = SETTINGS.GAME_HEIGHT / bgSprite.height;
                scale = Math.max(scaleX, scaleY) * SETTINGS.BG_SCALE_FACTOR;
            } else if (SETTINGS.BG_SCALE_MODE === 'contain') {
                // Contain mode: ensure entire image fits in the game area
                const scaleX = SETTINGS.GAME_WIDTH / bgSprite.width;
                const scaleY = SETTINGS.GAME_HEIGHT / bgSprite.height;
                scale = Math.min(scaleX, scaleY) * SETTINGS.BG_SCALE_FACTOR;
            } else {
                // Exact mode: use the scale factor directly
                scale = SETTINGS.BG_SCALE_FACTOR;
            }

            // Center anchor and apply scale
            bgSprite.anchor.set(0.5);
            bgSprite.scale.set(scale);

            // Ensure background doesn't interfere with game play
            bgSprite.eventMode = 'none';

            // Add the background to its container
            backgroundLayer.addChild(bgSprite);

            // Add background layer to stage
            if (!app?.stage) throw new Error("Pixi stage not available after init.");
            app.stage.addChild(backgroundLayer);

            // Store reference to background sprite for adjustments
            this.backgroundSprite = bgSprite;

            // Create reel container (middle z-index)
            reelContainer = new PIXI.Container();
            reelContainer.x = SETTINGS.reelAreaX;
            reelContainer.y = SETTINGS.reelAreaY;

            // Add slight shadow to reels container for depth
            const reelShadow = new PIXI.Graphics()
                .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
                .fill({ color: 0x000000, alpha: 0.2 });
            reelContainer.addChild(reelShadow);

            app.stage.addChild(reelContainer);

            uiContainer = new PIXI.Container();
            app.stage.addChild(uiContainer); // Add UI container

            winLineGraphics = new PIXI.Graphics();
            // Position set in initPaylineGraphics
            app.stage.addChild(winLineGraphics);

            // Create overlay and particle containers but add them LATER
            overlayContainer = new PIXI.Container(); // For win messages, FS indicator, etc.
            particleContainer = new PIXI.Container(); // For particle effects

            // --- Initialize Feature/UI Modules with Containers ---
            initPaylineGraphics(winLineGraphics);
            initNotifications(overlayContainer); // Pass overlay container
            initAnimations(overlayContainer, particleContainer); // Pass relevant containers
            initTurboMode(reels); // Pass reels array reference

            // --- Create Free Spins Indicator (moved from UIManager) ---
            // Add it to the overlayContainer so it's on top
            createFreeSpinsIndicator(overlayContainer);

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

            // --- Setup UI (adds title text directly to stage) ---
            this.setupUI(); // Call UI setup method

            // --- Add Overlay and Particle Containers AFTER UI Setup ---
            // This ensures they render on top of the title text
            app.stage.addChild(overlayContainer);
            app.stage.addChild(particleContainer);


            // --- Initialize Info Overlay (DOM) ---
            infoOverlayElement = document.getElementById('infoOverlay'); // Get DOM element
            if (infoOverlayElement) {
                initInfoOverlay(infoOverlayElement); // Initialize the module
                updateInfoOverlay(); // Initial update
            } else {
                console.warn("Game Setup: infoOverlay element not found in DOM.");
            }

            // --- Initialize Debug Panel ---
            initDebugPanel(app);

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
            if (this.canvasContainer) {
                this.canvasContainer.innerHTML = `Error initializing graphics: ${err.message}. Check console.`;
            }
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
        const titleText = new PIXI.Text({ text: "MAD SCIENTIST", style: titleStyle });
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
            .fill({ color: 0x1a1a1a, alpha: 0.85 });
        if (uiContainer) { // Add check for uiContainer
            uiContainer.addChild(panel);
        }

        // --- Text Styles ---
        const uiTextStyle = { fontFamily: "Arial, sans-serif", fontSize: 18, fill: 0xdddddd };
        const uiValueStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } };
        const buttonTextStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 20, fill: 0xffffff };

        // --- Create UI Elements (using UIManager) ---
        // UIManager should handle creation and storing references
        initUIManager(uiContainer, uiTextStyle, uiValueStyle);

        // --- Create Buttons (using ButtonFactory and handlers) ---
        const bottomUIY = SETTINGS.bottomUIY;
        const btnW = 45, btnH = 45; // Slightly larger buttons
        const spinBtnSize = 85; // Larger spin button

        // Improved button positioning
        // Bet Buttons (Using iconType)
        createButton("", SETTINGS.GAME_WIDTH - 180, bottomUIY + 52, handlers.decreaseBet, {}, uiContainer, btnW, btnH, false, 'minus').name = "betDecreaseButton";
        createButton("", SETTINGS.GAME_WIDTH - 115, bottomUIY + 52, handlers.increaseBet, {}, uiContainer, btnW, btnH, false, 'plus').name = "betIncreaseButton";

        // Spin Button (Circular with Icon) - Positioned more prominently
        createButton("", SETTINGS.GAME_WIDTH - 80, SETTINGS.GAME_HEIGHT / 2 + 80, handlers.startSpin, {}, uiContainer, spinBtnSize, spinBtnSize, true, 'spin').name = "spinButton";

        // Turbo Button (Using iconType) - Positioned with better spacing
        createButton("", 100, bottomUIY + 52, handlers.toggleTurbo, {}, uiContainer, btnW, btnH, false, 'turbo').name = "turboButton";

        // Autoplay Button (Using iconType)
        createButton("", 180, bottomUIY + 52, handlers.toggleAutoplay, {}, uiContainer, btnW, btnH, false, 'autoplay').name = "autoplayButton";
    }

    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        try {
            // console.log(`[Trace] Game.update start. Delta: ${delta.toFixed(2)}ms, Now: ${now.toFixed(0)}ms`); // Keep this commented for now to reduce noise

            // console.log("[Trace] Updating reels..."); // Log before reel update loop
            // Update all reels
            reels.forEach((reel, index) => {
                // console.log(`[Trace] Updating reel ${index}...`); // Optional: Log each reel update start
                const isActive = reel.update(delta, now);
                if (isActive) {
                    anyReelMoving = true;
                }
                // console.log(`[Trace] Reel ${index} updated. isActive: ${isActive}`); // Optional: Log each reel update end
            });
            // console.log(`[Trace] Reels updated. anyReelMoving: ${anyReelMoving}`); // Log after reel update loop

            // console.log("[Trace] Updating particles..."); // Log before particle update
            // Update particle animations
            updateParticles(delta); // Restore this call
            // console.log("[Trace] Particles updated."); // Log after particle update

            // console.log("[Trace] Updating FS indicator..."); // Log before indicator update
            // Update Free Spins Indicator (moved from UIManager)
            updateFreeSpinsIndicator();
            // console.log("[Trace] FS indicator updated."); // Log after indicator update

            // Update button states in improved UI if state changes
           // updateButtonStates();

            // console.log(`[Trace] Checking spin end condition: isSpinning=${state.isSpinning}, anyReelMoving=${anyReelMoving}, isTransitioning=${state.isTransitioning}`); // Log before spin end check
            // Check if the spin has just ended AND we are not already handling a previous spin end
            if (state.isSpinning && !anyReelMoving && !state.isTransitioning) {
                // console.log("[Trace] Spin end condition met. Calling handleSpinEnd..."); // Log handleSpinEnd call
                this.handleSpinEnd();
            }
            // console.log("[Trace] Game.update end."); // Log end of try block

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
                // Call the handleFreeSpinEnd function directly
                handleFreeSpinEnd();
            } else if (state.isAutoplaying) {
                handleAutoplayNextSpin(); // Check if next autoplay spin should start
            } else {
                setButtonsEnabled(true); // Re-enable buttons for manual play
            }
        }, 50 * winAnimDelayMultiplier); // Use animation multiplier for delay
    }

    /**
     * Start the spinning process for all reels
     */
    startSpinLoop() {
        // Schedule each reel to stop after a delay
        let winPattern = null;

        // If force win is enabled, generate a winning pattern before starting the spins
        if (state.isDebugMode && state.forceWin) {
          console.log("Debug mode active: Forcing a win pattern");
          winPattern = this.generateRandomWinPattern();
          console.log("Generated win pattern:", winPattern);
        }

        for (let i = 0; i < reels.length; i++) {
          const reel = reels[i];

          // Start spinning the reel
          reel.startSpinning();

          // Schedule when to stop the reel
          // Use the animation settings constants
          const stopDelay = baseSpinDuration + (i * REEL_STOP_STAGGER);

          setTimeout(() => {
            // If in debug mode and force win is enabled, use the predetermined winning pattern
            if (state.isDebugMode && state.forceWin && winPattern) {
              // Find stop position that will show the target symbol in the correct position
              const stopIndex = this.findStopIndexForSymbol(reel, winPattern.symbol, winPattern.positions[i]);
              reel.scheduleStop(stopIndex);
            } else {
              // Normal random stop logic
              const randomStopIndex = Math.floor(Math.random() * reel.totalSymbols);
              reel.scheduleStop(randomStopIndex);
            }
          }, stopDelay);
        }
    }

    /**
     * Generate a random winning pattern
     * @returns {{symbol: string, positions: number[]}} A winning pattern with symbol and positions
     */
    generateRandomWinPattern() {
        // Use only high-value symbols for testing
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];

        // Choose a random high-value symbol
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];

        // For simplicity, always use the middle row (index 1) for our winning line
        const rowIndex = 1;

        // Determine win length - favor longer wins for testing
        const winLength = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5

        // Generate positions array (showing which row the symbol should appear on each reel)
        const positions = [];
        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
          // For reels within our win length, use the selected row
          if (i < winLength) {
            positions.push(rowIndex);
          } else {
            // For reels beyond our win length, use random positions
            positions.push(Math.floor(Math.random() * SETTINGS.SYMBOLS_PER_REEL_VISIBLE));
          }
        }

        return {
          symbol: winSymbol,
          positions: positions
        };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * @param {Reel} reel - The reel object
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     */
    findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
        // Get the current sequence of symbols on the reel
        // Assuming reel.strip holds the symbol IDs
        const symbols = reel.strip;
        if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1)); // Fallback

        // Try to find the target symbol
        for (let i = 0; i < symbols.length; i++) {
          if (symbols[i] === targetSymbol) {
            // Calculate the stop index that would place this symbol at the target position
            // The stop index must be adjusted for the target position
            let stopIndex = (i - targetPosition + symbols.length) % symbols.length; // Ensure positive result

            return stopIndex;
          }
        }

        // Fallback: if the symbol isn't found, use a random stop position
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

    /**
     * Allows dynamic adjustment of the background position and scale
     * @param {number} offsetX - X-axis offset adjustment
     * @param {number} offsetY - Y-axis offset adjustment
     * @param {number} scale - Scale adjustment factor
     */
    adjustBackground(offsetX, offsetY, scale) {
        if (!this.backgroundSprite) return;

        // Update position
        this.backgroundSprite.x = SETTINGS.GAME_WIDTH / 2 + offsetX;
        this.backgroundSprite.y = SETTINGS.GAME_HEIGHT / 2 + offsetY;

        // Update scale with current factor
        const baseScale = SETTINGS.BG_SCALE_MODE === 'cover'
            ? Math.max(SETTINGS.GAME_WIDTH / this.backgroundSprite.texture.width,
                      SETTINGS.GAME_HEIGHT / this.backgroundSprite.texture.height)
            : SETTINGS.BG_SCALE_MODE === 'contain'
                ? Math.min(SETTINGS.GAME_WIDTH / this.backgroundSprite.texture.width,
                          SETTINGS.GAME_HEIGHT / this.backgroundSprite.texture.height)
                : 1;

        this.backgroundSprite.scale.set(baseScale * scale);

        console.log(`Background adjusted: offset(${offsetX}, ${offsetY}), scale: ${scale}`);
    }
}


// --- Free Spins UI Functions (Moved from UIManager) ---

/**
 * Creates the free spins indicator overlay and adds it to the specified container.
 * @param {PIXI.Container} container - The container to add the indicator to (e.g., overlayContainer).
 */
function createFreeSpinsIndicator(container) {
    console.log("=== Creating Free Spins Indicator ===");
    
    // Create container for free spins UI elements
    freeSpinsIndicator = new PIXI.Container();
    freeSpinsIndicator.visible = false; // Hide initially

    // Position at the top center of the screen
    freeSpinsIndicator.x = SETTINGS.GAME_WIDTH / 2;
    freeSpinsIndicator.y = 60; // Adjusted Y position to be below title

    // Create background panel
    const panel = new PIXI.Graphics();
    panel.beginFill(0x9932CC, 0.85); // Deep purple with transparency
    panel.lineStyle(3, 0xFFD700, 1); // Gold border
    panel.drawRoundedRect(-150, 0, 300, 80, 10); // Centered rectangle
    panel.endFill();

    // Add glow filter
    freeSpinsGlow = new PIXI.Graphics();
    freeSpinsGlow.beginFill(0xFFD700, 0.3);
    freeSpinsGlow.drawRoundedRect(-155, -5, 310, 90, 12);
    freeSpinsGlow.endFill();
    freeSpinsGlow.alpha = 0;

    // Create title text
    const titleStyle = new PIXI.TextStyle({
        fontFamily: 'Impact, Charcoal, sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xFFD700, // Single gold color as hex number
        stroke: { color: 0x000000, width: 3 },
        dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 2 },
        align: 'center'
    });

    const title = new PIXI.Text("FREE SPINS", titleStyle);
    title.anchor.set(0.5, 0);
    title.y = 10;

    // Create free spins count text
    const countStyle = new PIXI.TextStyle({
        fontFamily: '"Arial Black", Gadget, sans-serif',
        fontSize: 18,
        fill: 0xFFFFFF, // Use hex number instead of string
        fontWeight: 'bold',
        align: 'center'
    });

    freeSpinsCountText = new PIXI.Text("Remaining: 10", countStyle);
    freeSpinsCountText.anchor.set(0.5, 0);
    freeSpinsCountText.y = 45;

    // Create total win text
    freeSpinsTotalWinText = new PIXI.Text("Total Win: €0.00", countStyle);
    freeSpinsTotalWinText.anchor.set(0.5, 0);
    freeSpinsTotalWinText.y = 45;
    freeSpinsTotalWinText.x = 180; // Position to the right of spins count

    // Add all elements to container
    freeSpinsIndicator.addChild(freeSpinsGlow);
    freeSpinsIndicator.addChild(panel);
    freeSpinsIndicator.addChild(title);
    freeSpinsIndicator.addChild(freeSpinsCountText);
    freeSpinsIndicator.addChild(freeSpinsTotalWinText);

    // Add to the specified container (should be overlayContainer)
    container.addChild(freeSpinsIndicator);
    
    // Log the setup status
    console.log(`Free Spins Indicator setup: x=${freeSpinsIndicator.x}, y=${freeSpinsIndicator.y}, visible=${freeSpinsIndicator.visible}`);
    console.log(`Added to container: ${container ? 'Yes' : 'No'}, Container children: ${container?.children?.length}`);
    console.log("=== Free Spins Indicator Created ===");
    
    // Force visibility once (for debug only) then hide again
    setTimeout(() => {
        if (freeSpinsIndicator) {
            console.log("DEBUG: Testing Free Spins indicator visibility");
            freeSpinsIndicator.visible = true;
            freeSpinsIndicator.alpha = 1;
            
            setTimeout(() => {
                if (freeSpinsIndicator) {
                    freeSpinsIndicator.visible = false;
                    console.log("DEBUG: Reset Free Spins indicator visibility");
                }
            }, 500);
        }
    }, 2000);
}

/**
 * Updates the free spins indicator with current state. Called in Game.update()
 */
function updateFreeSpinsIndicator() {
    // Only log if something interesting might happen (entering/exiting FS or indicator visible)
    if (state.isInFreeSpins || freeSpinsIndicator?.visible) {
        console.log(`[Trace] updateFreeSpinsIndicator called. isInFreeSpins: ${state.isInFreeSpins}, indicator visible: ${freeSpinsIndicator?.visible}`);
    }

    if (!freeSpinsIndicator || !freeSpinsCountText || !freeSpinsTotalWinText) {
        return;
    }

    // Add debounce mechanism to prevent rapid toggling
    // Store last state change time if not already set
    freeSpinsIndicator._lastStateChange = freeSpinsIndicator._lastStateChange || 0;
    const now = performance.now();
    const debounceTime = 250; // Reduced from 1000ms to 250ms - allow more frequent updates
    
    // Always update text content if in free spins mode
    const inFreeSpin = state.isInFreeSpins;
    if (inFreeSpin) {
        freeSpinsCountText.text = `Remaining: ${state.freeSpinsRemaining}`;
        freeSpinsTotalWinText.text = `Win: €${state.totalFreeSpinsWin.toFixed(2)}`;
    }

    // Only check debounce for hiding the indicator, not for showing it!
    // Allow showing immediately when entering free spins
    if (inFreeSpin) {
        // Show indicator if not already visible
        if (!freeSpinsIndicator.visible) {
            console.log("[Trace] Indicator not visible - Animating in."); 
            freeSpinsIndicator.visible = true;
            freeSpinsIndicator.alpha = 0;
            freeSpinsIndicator.y = -50; // Start above screen

            // Store time of state change
            freeSpinsIndicator._lastStateChange = now;

            // Kill any existing animations to prevent conflicts
            gsap.killTweensOf(freeSpinsIndicator);

            // Animate it in
            gsap.to(freeSpinsIndicator, {
                y: 60, // Target Y position (below title)
                alpha: 1,
                duration: 0.5,
                ease: "back.out(1.7)"
            });

            // Start pulsing glow animation
            startGlowAnimation();
        }

        // Flash when spins count changes (using a temporary property to track last count)
        // Only flash if the count has actually changed and is defined
        if (freeSpinsIndicator._lastCount !== undefined && freeSpinsIndicator._lastCount !== state.freeSpinsRemaining) {
            gsap.to(freeSpinsCountText.scale, {
                x: 1.2, y: 1.2,
                duration: 0.2,
                repeat: 1,
                yoyo: true,
                ease: "power1.inOut"
            });
        }

        // Store current count for comparison on next update
        freeSpinsIndicator._lastCount = state.freeSpinsRemaining;

    } else if (freeSpinsIndicator.visible) {
        // Only apply debounce to hiding the indicator
        // This prevents flickering when exiting
        if (state.isTransitioning || (now - freeSpinsIndicator._lastStateChange < debounceTime)) {
            return; // Don't hide during transitions or too soon after showing
        }
        
        console.log("[Trace] Not in Free Spins & indicator visible - Animating out."); 
        
        // Store time of state change
        freeSpinsIndicator._lastStateChange = now;
        
        // Kill any existing animations to prevent conflicts
        gsap.killTweensOf(freeSpinsIndicator);
        
        // Animate it out
        gsap.to(freeSpinsIndicator, {
            y: -50,
            alpha: 0,
            duration: 0.5,
            ease: "back.in(1.7)",
            onComplete: () => {
                freeSpinsIndicator.visible = false;
                stopGlowAnimation();
                delete freeSpinsIndicator._lastCount; // Clean up temporary property
            }
        });
    }
}

/**
 * Starts pulsing glow animation for free spins indicator
 */
function startGlowAnimation() {
    if (!freeSpinsGlow) return;

    // Kill any existing animations
    gsap.killTweensOf(freeSpinsGlow);

    // Create pulsing animation
    gsap.to(freeSpinsGlow, {
        alpha: 0.7,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });
}

/**
 * Stops glow animation for free spins indicator
 */
function stopGlowAnimation() {
    if (!freeSpinsGlow) return;

    // Kill animation and reset
    gsap.killTweensOf(freeSpinsGlow);
    freeSpinsGlow.alpha = 0;
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

    // If debug mode with force win is enabled, generate a winning pattern for all reels
    let winPattern = null;
    if (state.isDebugMode && state.forceWin) {
        winPattern = generateRandomWinPattern();
        console.log(`Debug - Forcing win with ${winPattern.symbol} on line ${winPattern.line}`);
    }

    // Start all reels spinning and schedule their stops
    reels.forEach((reel, i) => {
        reel.startSpinning(isTurbo); // Start spinning visually

        // Apply the winning pattern if debug mode is enabled
        if (winPattern) {
            reel.stopIndex = winPattern.stopIndices[i];
            reel.finalStopPosition = winPattern.stopIndices[i];
        }

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

// Note: generateRandomWinPattern and findStopIndexForSymbol were previously outside the class,
// but they are called by startSpinLoop which is inside the class.
// They should ideally be methods of the Game class or utility functions.
// For now, keeping them as module-level functions as they were, but this might need refactoring.

/**
 * Generates a random winning pattern for the reels
 * @returns {Object} Object containing symbol, line number, and stop indices
 */
function generateRandomWinPattern() {
    // Use high-value symbols for better wins
    const winningSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];

    // Choose a random symbol
    const symbolIndex = Math.floor(Math.random() * winningSymbols.length);
    const symbol = winningSymbols[symbolIndex];

    // For simplicity and reliability, use the middle row (line index 1)
    // This is the most reliable way to create wins
    const paylineIndex = 1;

    // Choose a random win length (3, 4, or 5)
    // Bias toward 5 to get bigger wins for testing
    const winLength = Math.random() < 0.5 ? 5 : (Math.random() < 0.7 ? 4 : 3);

    console.log(`Debug - Creating win pattern with ${symbol} for ${winLength} reels on middle row`);

    // For each reel, find positions where our symbol can appear
    const stopIndices = [];

    for (let i = 0; i < REEL_STRIPS.length; i++) {
        const strip = REEL_STRIPS[i];

        // For reels that should show the winning symbol
        if (i < winLength) {
            // Find all positions of the target symbol
            const symbolPositions = [];
            for (let j = 0; j < strip.length; j++) {
                if (strip[j] === symbol) {
                    symbolPositions.push(j);
                }
            }

            // If we couldn't find the symbol on this reel, look for any high value symbol
            if (symbolPositions.length === 0) {
                // Use a fallback symbol from our list
                for (const fallbackSymbol of winningSymbols) {
                    if (fallbackSymbol === symbol) continue; // Skip the one we already tried

                    // Check if this fallback symbol exists on the reel
                    for (let j = 0; j < strip.length; j++) {
                        if (strip[j] === fallbackSymbol) {
                            symbolPositions.push(j);
                        }
                    }

                    if (symbolPositions.length > 0) {
                        console.log(`Debug - Using fallback symbol ${fallbackSymbol} on reel ${i}`);
                        break; // Found a fallback symbol
                    }
                }

                // Last resort fallback
                if (symbolPositions.length === 0) {
                    const randomPos = Math.floor(Math.random() * strip.length);
                    symbolPositions.push(randomPos);
                    console.log(`Debug - Using random position on reel ${i} as last resort`);
                }
            }

            // Choose random position from our found positions
            const randomPosition = symbolPositions[Math.floor(Math.random() * symbolPositions.length)];

            // For middle row, offset is 1
            const offset = 1;

            // Calculate the stop index that places the symbol in the middle row
            // We need to "back up" the strip by the offset to get the symbol at the right row
            const stopIndex = (randomPosition - offset + strip.length) % strip.length;
            stopIndices.push(stopIndex);
        }
        else {
            // For reels beyond our win length, place random symbols
            const stopIndex = Math.floor(Math.random() * strip.length);
            stopIndices.push(stopIndex);
        }
    }

    return {
        symbol: symbol,
        line: paylineIndex,
        stopIndices: stopIndices
    };
}

/**
 * Find the stop index that will show the target symbol in the target position
 * @param {Reel} reel - The reel object
 * @param {string} targetSymbol - The symbol we want to show
 * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
 * @returns {number} The stop index that will show the target symbol in position
 */
function findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
    // Get the current sequence of symbols on the reel
    // Assuming reel.strip holds the symbol IDs
    const symbols = reel.strip;
    if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1)); // Fallback

    // Try to find the target symbol
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === targetSymbol) {
        // Calculate the stop index that would place this symbol at the target position
        // The stop index must be adjusted for the target position
        let stopIndex = (i - targetPosition + symbols.length) % symbols.length; // Ensure positive result

        return stopIndex;
      }
    }

    // Fallback: if the symbol isn't found, use a random stop position
    console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
    return Math.floor(Math.random() * symbols.length);
}
