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
import { FreeSpinsUIManager } from '../ui/FreeSpinsUIManager.js'; // Import FreeSpinsUIManager
import { BackgroundManager } from './BackgroundManager.js'; // Import BackgroundManager
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations


// --- Module-level variables ---
let app = null; // Pixi Application instance
let reels = []; // Array of Reel instances
let infoOverlayElement; // DOM element for info overlay

// Removed old FS UI variables


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
    backgroundSprite = null; // Keep for potential direct access if needed, but managed by BackgroundManager
    freeSpinsUIManager = null;
    backgroundManager = null; // Add manager property

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
            this._exposeGlobals();
            await this._setupPixiApp();
            await this._loadAssets();
            this._createLayers();
            this._createManagers(); // Create managers after layers exist

            // Create temporary containers needed for element creation before they are placed in layers
            const reelContainer = new PIXI.Container();
            const uiContainer = new PIXI.Container();
            const winLineGraphics = new PIXI.Graphics();

            this._createGameElements(reelContainer, uiContainer, winLineGraphics);
            this._initCoreModules(reelContainer, winLineGraphics); // Pass necessary temp containers
            this._finalizeSetup();

            console.log("Game Initialized Successfully");

        } catch (err) {
            console.error("PixiJS or Game Init Failed:", err);
            if (this.canvasContainer) {
                this.canvasContainer.innerHTML = `Error initializing graphics: ${err.message}. Check console.`;
            }
        }
    }

    _exposeGlobals() {
        // Make this instance and managers accessible globally for debugging
        if (typeof window !== 'undefined') {
            // @ts-ignore - Dynamically adding properties
            window.gameApp = this; // Expose Game instance
            // Managers will be added later
        }
    }

    async _setupPixiApp() {
        app = new PIXI.Application();
        await app.init({
            width: SETTINGS.GAME_WIDTH,
            height: SETTINGS.GAME_HEIGHT,
            backgroundColor: SETTINGS.normalBgColor,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        if (app?.canvas && this.canvasContainer) {
            this.canvasContainer.appendChild(app.canvas);
        } else {
            throw new Error("Pixi Application or canvas could not be initialized.");
        }
    }

    async _loadAssets() {
        const symbolAssets = SYMBOL_DEFINITIONS.map(def => ({
            alias: def.id,
            src: `assets/images/${def.id}.png`
        }));
        symbolAssets.push({ alias: 'BG_IMAGE', src: 'assets/images/background/bg.png' });

        console.log("Loading symbol assets:", symbolAssets);
        await PIXI.Assets.load(symbolAssets);
        console.log("Symbol assets loaded.");

        console.log("Loading button assets...");
        await loadButtonAssets();
    }

    _createLayers() {
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
        this.layerOverlays.sortableChildren = true;

        this.layerParticles = new PIXI.Container();
        this.layerParticles.name = "Layer: Particles";
        this.layerParticles.zIndex = 60;

        this.layerDebug = new PIXI.Container();
        this.layerDebug.name = "Layer: Debug";
        this.layerDebug.zIndex = 100;
        this.layerDebug.visible = false;

        app.stage.addChild(this.layerBackground, this.layerReels, this.layerWinLines, this.layerUI, this.layerLogo, this.layerOverlays, this.layerParticles, this.layerDebug);
    }

    _createManagers() {
        // Instantiate managers, passing required layers
        this.backgroundManager = new BackgroundManager(this.layerBackground);
        this.freeSpinsUIManager = new FreeSpinsUIManager(this.layerOverlays);
        new LogoManager(this, this.layerLogo); // LogoManager doesn't need to be stored on `this` if not accessed elsewhere

        // Assign managed sprite if needed (though direct use should be minimized)
        this.backgroundSprite = this.backgroundManager.backgroundSprite;

        // Expose managers for debug panel access
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.gameApp.backgroundManager = this.backgroundManager;
            // @ts-ignore
            window.gameApp.freeSpinsUIManager = this.freeSpinsUIManager;
        }
    }

    _createGameElements(reelContainer, uiContainer, winLineGraphics) {
        // --- Populate Temporary Reel Container ---
        reelContainer.x = SETTINGS.reelAreaX;
        reelContainer.y = SETTINGS.reelAreaY;
        const reelShadow = new PIXI.Graphics()
            .rect(0, 0, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill({ color: 0x000000, alpha: 0.2 });
        reelContainer.addChild(reelShadow);
        if (this.layerReels) {
            this.layerReels.addChild(reelContainer);
        }

        // --- Add WinLine Graphics to Layer ---
        if (this.layerWinLines) {
            this.layerWinLines.addChild(winLineGraphics);
        }

        // --- Create Reels ---
        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            const reel = new Reel(i, REEL_STRIPS[i], app.ticker);
            reels.push(reel);
            reelContainer.addChild(reel.container);
        }

        // --- Reel Mask ---
        const reelMask = new PIXI.Graphics()
            .rect(SETTINGS.reelAreaX, SETTINGS.reelAreaY, SETTINGS.NUM_REELS * SETTINGS.REEL_WIDTH, SETTINGS.REEL_VISIBLE_HEIGHT)
            .fill(0xffffff);
        reelContainer.mask = reelMask;
        if (app?.stage) {
           app.stage.addChild(reelMask);
        }

        // --- Setup UI ---
        if (this.layerUI) {
            this.layerUI.addChild(uiContainer);
        }
        this.setupUI(uiContainer); // Pass the temporary UI container
    }

    _initCoreModules(reelContainer, winLineGraphics) {
        // Initialize modules that depend on game elements or temporary containers
        initFreeSpins(app, reelContainer, reels); // Still needs reelContainer temporarily? Check FreeSpins.js logic
        initPaylineGraphics(winLineGraphics);
        initNotifications(this.layerOverlays);
        initAnimations(this.layerOverlays, this.layerParticles);
        initTurboMode(reels);
        initWinEvaluation(reels);

        // --- Initialize Info Overlay (DOM) ---
        infoOverlayElement = document.getElementById('infoOverlay');
        if (infoOverlayElement) {
            initInfoOverlay(infoOverlayElement);
            updateInfoOverlay(); // Initial update
        } else {
            console.warn("Game Setup: infoOverlay element not found in DOM.");
        }

        // --- Initialize Debug Panel ---
        if (this.layerDebug) {
            initDebugPanel(app, this.layerDebug);
        } else {
             console.error("Game Init: layerDebug is unexpectedly null before initDebugPanel call.");
        }
    }

    _finalizeSetup() {
        // Final stage sort
        app.stage.sortChildren();
        console.log("Stage children sorted by zIndex:", app.stage.children.map(c => ({ name: c.name, zIndex: c.zIndex })));

        // Initial UI updates and state settings
        updateDisplays();
        setButtonsEnabled(true);
        applyTurboSettings(state.isTurboMode);

        // Start game loop
        if (app?.ticker) {
            app.ticker.add(this.update.bind(this));
        } else {
             throw new Error("Pixi ticker not available after init.");
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
            // Update Free Spins Indicator via manager
            if (this.freeSpinsUIManager) {
                this.freeSpinsUIManager.update();
            }
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

    // Removed adjustBackground method - now handled by BackgroundManager
}

// Removed old FS UI functions (createFreeSpinsIndicator, updateFreeSpinsIndicator, startGlowAnimation, stopGlowAnimation)


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
