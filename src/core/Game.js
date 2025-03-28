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
import { LogoManager } from '../ui/LogoManager.js'; // Import LogoManager
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations


// --- Module-level variables ---
let app = null; // Pixi Application instance
let reels = []; // Array of Reel instances
let infoOverlayElement; // DOM element for info overlay

// Free Spins UI Elements (moved from UIManager, will be added to layerOverlays)
let freeSpinsIndicator = null;
let freeSpinsCountText = null;
let freeSpinsTotalWinText = null;
let freeSpinsGlow = null;


// --- Game Class ---
export class Game {
    // Layer Containers
    layerBackground = null;
    layerReels = null;
    layerWinLines = null;
    layerUI = null;
    layerLogo = null;
    layerOverlays = null;
    layerParticles = null;
    layerDebug = null;

    // Other properties
    backgroundSprite = null;

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

            // --- Create Layer Containers (Task 1.1) ---
            this.layerBackground = new PIXI.Container();
            this.layerBackground.name = "Layer: Background";
            this.layerBackground.zIndex = 0;

            this.layerReels = new PIXI.Container();
            this.layerReels.name = "Layer: Reels";
            this.layerReels.zIndex = 10;

            this.layerWinLines = new PIXI.Container();
            this.layerWinLines.name = "Layer: Win Lines";
            this.layerWinLines.zIndex = 20;

            this.layerUI = new PIXI.Container();
            this.layerUI.name = "Layer: UI";
            this.layerUI.zIndex = 30;

            this.layerLogo = new PIXI.Container();
            this.layerLogo.name = "Layer: Logo";
            this.layerLogo.zIndex = 40;

            this.layerOverlays = new PIXI.Container();
            this.layerOverlays.name = "Layer: Overlays";
            this.layerOverlays.zIndex = 50;
            this.layerOverlays.sortableChildren = true; // For potential internal sorting

            this.layerParticles = new PIXI.Container();
            this.layerParticles.name = "Layer: Particles";
            this.layerParticles.zIndex = 60;

            this.layerDebug = new PIXI.Container();
            this.layerDebug.name = "Layer: Debug";
            this.layerDebug.zIndex = 100;
            this.layerDebug.visible = false; // Debug layer starts hidden

            // Add all layers to the stage
            app.stage.addChild(this.layerBackground);
            app.stage.addChild(this.layerReels);
            app.stage.addChild(this.layerWinLines);
            app.stage.addChild(this.layerUI);
            app.stage.addChild(this.layerLogo);
            app.stage.addChild(this.layerOverlays);
            app.stage.addChild(this.layerParticles);
            app.stage.addChild(this.layerDebug);

            // --- Create Temporary Containers (will be moved into layers in Phase 2) ---
            const reelContainer = new PIXI.Container(); // Temporary local var for now
            const uiContainer = new PIXI.Container(); // Temporary local var for now
            const winLineGraphics = new PIXI.Graphics(); // Temporary local var for now

            // --- Initialize Core Modules ---
            // Pass app, reelContainer, and reels (Original argument order)
            initFreeSpins(app, reelContainer, reels);
            // Task 2.5: Instantiate LogoManager with the logo layer
            new LogoManager(this, this.layerLogo);

            // --- Create Background Sprite ---
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

            // Store reference to background sprite for adjustments
            this.backgroundSprite = bgSprite;
            // Task 2.1: Add background sprite to its layer
            if (this.layerBackground && this.backgroundSprite) {
                this.layerBackground.addChild(this.backgroundSprite);
            }

            // --- Populate Temporary Reel Container ---
            reelContainer.x = SETTINGS.reelAreaX;
            reelContainer.y = SETTINGS.reelAreaY;
            // Add slight shadow
            const reelShadow = new PIXI.Graphics()
                .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
                .fill({ color: 0x000000, alpha: 0.2 });
            reelContainer.addChild(reelShadow);
            // Task 2.2: Add reelContainer to its layer
            if (this.layerReels) {
                this.layerReels.addChild(reelContainer);
            }

            // --- Initialize Feature/UI Modules with NEW Layers ---
            // Task 2.3: Add winLineGraphics to its layer
            if (this.layerWinLines) {
                this.layerWinLines.addChild(winLineGraphics);
            }
            initPaylineGraphics(winLineGraphics); // Still uses the graphics object directly
            initNotifications(this.layerOverlays); // Pass overlay layer
            initAnimations(this.layerOverlays, this.layerParticles); // Pass relevant layers
            initTurboMode(reels); // Pass reels array reference

            // --- Create Free Spins Indicator (using new layer) ---
            // (Task 2.6 will modify createFreeSpinsIndicator and call it here)
            createFreeSpinsIndicator(this.layerOverlays); // Pass overlay layer

            // --- Create Reels and add to Temporary Container ---
            for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
                const reel = new Reel(i, REEL_STRIPS[i], app.ticker);
                reels.push(reel);
                // (Task 2.2 will add reel.container to the main reelContainer)
                reelContainer.addChild(reel.container); // Add to temp container for now
            }
            initWinEvaluation(reels); // Pass reels array reference

            // --- Reel Mask ---
            const reelMask = new PIXI.Graphics()
                .rect(SETTINGS.reelAreaX, SETTINGS.reelAreaY, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
                .fill(0xffffff);
            reelContainer.mask = reelMask; // Apply mask to the container
            // Mask graphic itself needs to be added to a common ancestor, stage is fine.
            // It doesn't render visually, just defines the mask area.
            if (app?.stage) {
               app.stage.addChild(reelMask);
            }

            // --- Setup UI ---
            // Task 2.4: Add uiContainer to its layer
            if (this.layerUI) {
                this.layerUI.addChild(uiContainer);
            }
            this.setupUI(uiContainer); // Pass the temporary UI container

            // --- Initialize Info Overlay (DOM) ---
            infoOverlayElement = document.getElementById('infoOverlay'); // Get DOM element
            if (infoOverlayElement) {
                initInfoOverlay(infoOverlayElement); // Initialize the module
                updateInfoOverlay(); // Initial update
            } else {
                console.warn("Game Setup: infoOverlay element not found in DOM.");
            }

            // --- Initialize Debug Panel ---
            // Task 2.8: Pass the debug layer to initDebugPanel
            if (this.layerDebug) { // Add null check for TS
                initDebugPanel(app, this.layerDebug);
            } else {
                 console.error("Game Init: layerDebug is unexpectedly null before initDebugPanel call.");
                 // Fallback or further error handling might be needed
            }

            // --- Final Setup ---
            // Task 2.9: Ensure stage is sorted once and log the result
            app.stage.sortChildren(); // Sort stage based on zIndex
            console.log("Stage children sorted by zIndex:", app.stage.children.map(c => ({ name: c.name, zIndex: c.zIndex })));

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

    // Modify setupUI to accept the container it should add elements to
    setupUI(container) {
        // --- Title ---
        // NOTE: Title was previously added directly to stage.
        // It should probably be part of the UI layer now.
        const titleStyle = {
             fontFamily: "Impact, Charcoal, sans-serif",
             fontSize: 40,
             // Use a single color for fill as PixiJS expects
             fill: 0xffd700, // Gold color
             stroke: { color: "#8B0000", width: 3 },
             dropShadow: { color: "#000000", distance: 4, blur: 4, angle: Math.PI / 4, alpha: 0.7 }
            };
        // const titleText = new PIXI.Text({ text: "MAD SCIENTIST", style: titleStyle });
        // titleText.anchor.set(0.5, 0);
        // titleText.x = SETTINGS.GAME_WIDTH / 2;
        // titleText.y = 15;
        // container.addChild(titleText); // Add title to the passed UI container

        // --- UI Panel ---
        const panelHeight = 100;
        const panel = new PIXI.Graphics()
            .rect(0, SETTINGS.GAME_HEIGHT - panelHeight, SETTINGS.GAME_WIDTH, panelHeight)
            .fill({ color: 0x1a1a1a, alpha: 0.85 });
        if (container) { // Use the passed container
            container.addChild(panel);
        }

        // --- Text Styles ---
        const uiTextStyle = { fontFamily: "Arial, sans-serif", fontSize: 18, fill: 0xdddddd };
        const uiValueStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } };
        const buttonTextStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 20, fill: 0xffffff };

        // --- Create UI Elements (using UIManager) ---
        // UIManager should handle creation and storing references
        initUIManager(container, uiTextStyle, uiValueStyle); // Pass the container

        // --- Create Buttons (using ButtonFactory and handlers) ---
        const bottomUIY = SETTINGS.bottomUIY;
        const btnW = 45, btnH = 45; // Slightly larger buttons
        const spinBtnSize = 85; // Larger spin button

        // Improved button positioning
        // Bet Buttons (Using iconType)
        createButton("", SETTINGS.GAME_WIDTH - 180, bottomUIY + 52, handlers.decreaseBet, {}, container, btnW, btnH, false, 'minus').name = "betDecreaseButton";
        createButton("", SETTINGS.GAME_WIDTH - 115, bottomUIY + 52, handlers.increaseBet, {}, container, btnW, btnH, false, 'plus').name = "betIncreaseButton";

        // Spin Button (Circular with Icon) - Positioned more prominently
        createButton("", SETTINGS.GAME_WIDTH - 80, SETTINGS.GAME_HEIGHT / 2 + 80, handlers.startSpin, {}, container, spinBtnSize, spinBtnSize, true, 'spin').name = "spinButton";

        // Turbo Button (Using iconType) - Positioned with better spacing
        createButton("", 100, bottomUIY + 52, handlers.toggleTurbo, {}, container, btnW, btnH, false, 'turbo').name = "turboButton";

        // Autoplay Button (Using iconType)
        createButton("", 180, bottomUIY + 52, handlers.toggleAutoplay, {}, container, btnW, btnH, false, 'autoplay').name = "autoplayButton";
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
        // Add null check at the beginning
        if (!this.backgroundSprite) {
            console.warn("adjustBackground called before backgroundSprite was initialized.");
            return;
        }

        // Suppress TS errors in JS file for property access after null check
        // @ts-ignore
        this.backgroundSprite.x = SETTINGS.GAME_WIDTH / 2 + offsetX;
        // @ts-ignore
        this.backgroundSprite.y = SETTINGS.GAME_HEIGHT / 2 + offsetY;

        // Update scale with current factor
        // @ts-ignore
        const textureWidth = this.backgroundSprite.texture.width;
        // @ts-ignore
        const textureHeight = this.backgroundSprite.texture.height;

        const baseScale = SETTINGS.BG_SCALE_MODE === 'cover'
            ? Math.max(SETTINGS.GAME_WIDTH / textureWidth, SETTINGS.GAME_HEIGHT / textureHeight)
            : SETTINGS.BG_SCALE_MODE === 'contain'
                ? Math.min(SETTINGS.GAME_WIDTH / textureWidth, SETTINGS.GAME_HEIGHT / textureHeight)
                : 1;

        // @ts-ignore
        this.backgroundSprite.scale.set(baseScale * scale);

        console.log(`Background adjusted: offset(${offsetX}, ${offsetY}), scale: ${scale.toFixed(2)}`);
    }
}


// --- Free Spins UI Functions (Moved from UIManager) ---

/**
 * Creates the free spins indicator overlay and adds it to the specified parent layer.
 * @param {PIXI.Container} parentLayer - The layer to add the indicator to (e.g., layerOverlays).
 */
function createFreeSpinsIndicator(parentLayer) { // Renamed parameter
    // Create container for free spins UI elements
    freeSpinsIndicator = new PIXI.Container();
    freeSpinsIndicator.visible = false; // Hide initially

    // Position at the top center of the screen
    freeSpinsIndicator.x = SETTINGS.GAME_WIDTH / 2;
    freeSpinsIndicator.y = 60; // Adjusted Y position to be below title

    // Create background panel (Task 3.3 Enhancement)
    const panel = new PIXI.Graphics();
    panel.beginFill(0x8A2BE2, 0.9); // Slightly brighter BlueViolet, less transparent
    panel.lineStyle(4, 0xFFFF00, 1); // Thicker Yellow border
    panel.drawRoundedRect(-150, 0, 300, 80, 15); // More rounded corners
    panel.endFill();

    // Add glow filter (Task 3.3 Enhancement)
    freeSpinsGlow = new PIXI.Graphics();
    freeSpinsGlow.beginFill(0xFFFF00, 0.4); // Brighter yellow glow
    freeSpinsGlow.drawRoundedRect(-160, -8, 320, 96, 17); // Slightly larger glow area
    freeSpinsGlow.endFill();
    freeSpinsGlow.alpha = 0; // Starts hidden

    // Create title text (Task 3.3 Enhancement - slightly larger)
    const titleStyle = new PIXI.TextStyle({
        fontFamily: 'Impact, Charcoal, sans-serif',
        fontSize: 26, // Slightly larger
        fontWeight: 'bold',
        fill: 0xFFD700, // Gold
        stroke: { color: 0x000000, width: 3 },
        dropShadow: { color: 0x000000, alpha: 0.6, blur: 3, distance: 3 }, // Slightly stronger shadow
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

    // Add to the specified parent layer
    parentLayer.addChild(freeSpinsIndicator);
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
        // Log this specific condition only once if elements are missing, maybe during init?
        // Or keep logging if it's unexpected during gameplay. For now, let's comment it out to avoid potential loops if elements become null.
        // console.log("[Trace] updateFreeSpinsIndicator returning early - elements missing.");
        return;
    }

    // Show/hide based on free spins state
    const inFreeSpin = state.isInFreeSpins;
    if (inFreeSpin) {
        // Log only when actively updating within Free Spins
        // console.log("[Trace] In Free Spins - Updating indicator text.");

        // Update text content
        freeSpinsCountText.text = `Remaining: ${state.freeSpinsRemaining}`;
        freeSpinsTotalWinText.text = `Win: €${state.totalFreeSpinsWin.toFixed(2)}`;

        // Show indicator if not already visible
        if (!freeSpinsIndicator.visible) {
            console.log("[Trace] Indicator not visible - Animating in."); // Keep this log as it's a state change event
            freeSpinsIndicator.visible = true;
            freeSpinsIndicator.alpha = 0;
            freeSpinsIndicator.y = -50; // Start above screen

            // Animate it in (Task 3.2 Enhancement)
            gsap.to(freeSpinsIndicator, {
                y: 60, // Target Y position (below title)
                alpha: 1,
                rotation: 0.05, // Add slight rotation on entry
                duration: 0.7, // Slightly longer duration
                ease: "elastic.out(1, 0.8)" // More dynamic ease
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
        console.log("[Trace] Not in Free Spins & indicator visible - Animating out."); // Keep this log as it's a state change event
        // Animate it out (Task 3.2 Enhancement - return rotation to 0)
        gsap.to(freeSpinsIndicator, {
            y: -50,
            alpha: 0,
            rotation: 0, // Return rotation to 0 on exit
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

    // Create pulsing animation (Task 3.3 Enhancement - faster pulse)
    gsap.to(freeSpinsGlow, {
        alpha: 0.8, // Slightly more visible glow
        duration: 0.7, // Faster pulse
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
 * NOTE: This is an exported function, not a class method.
 * It accesses the module-level `reels` array.
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
 * @returns {Object | null} Object containing symbol, line number, and stop indices, or null if error
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

    // Ensure REEL_STRIPS is defined and has the expected structure
    if (!REEL_STRIPS || REEL_STRIPS.length !== SETTINGS.NUM_REELS) {
        console.error("Debug - REEL_STRIPS is invalid or doesn't match NUM_REELS.");
        return null; // Return null to indicate failure
    }

    for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
        const strip = REEL_STRIPS[i];
        if (!strip || strip.length === 0) {
            console.error(`Debug - Strip for reel ${i} is invalid.`);
            // Handle error: maybe push a default stop index or return null
            stopIndices.push(0); // Push a default index
            continue; // Skip to next reel
        }

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
