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
// Re-add Reel import for JSDoc hints in debug methods temporarily moved to SpinManager
import { Reel } from './Reel.js';
// Removed ButtonFactory import - now handled by UIManager
// import { createButton, loadButtonAssets } from '../ui/ButtonFactory.js';
// Removed handlers import - Button handlers are now internal to UIManager or called via SpinManager
// import * as handlers from '../ui/ButtonHandlers.js';
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
import { ReelManager } from './ReelManager.js'; // Import ReelManager
import { SpinManager } from './SpinManager.js'; // Import SpinManager
import { handleAutoplayNextSpin } from '../features/Autoplay.js';
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations
import { loadButtonAssets } from '../ui/ButtonFactory.js'; // Keep loadButtonAssets


// --- Module-level variables ---
let app = null; // Pixi Application instance
// let reels = []; // Array of Reel instances - Now managed by ReelManager
let infoOverlayElement; // DOM element for info overlay

// Removed old FS UI variables


// --- Game Class ---
export class Game {
    /** @type {PIXI.Container | null} */
    layerBackground = null;
    /** @type {PIXI.Container | null} */
    layerReels = null;
    /** @type {PIXI.Container | null} */
    layerWinLines = null;
    /** @type {PIXI.Container | null} */
    layerUI = null;
    /** @type {PIXI.Container | null} */
    layerLogo = null;
    /** @type {PIXI.Container | null} */
    layerOverlays = null;
    /** @type {PIXI.Container | null} */
    layerParticles = null;
    /** @type {PIXI.Container | null} */
    layerDebug = null;

    /** @type {PIXI.Sprite | null} */
    backgroundSprite = null;
    /** @type {FreeSpinsUIManager | null} */
    freeSpinsUIManager = null;
    /** @type {BackgroundManager | null} */
    backgroundManager = null;
    /** @type {ReelManager | null} */
    reelManager = null;
    /** @type {SpinManager | null} */
    spinManager = null;

    /** @type {HTMLElement | null} */
    canvasContainer = null;

    /**
     * @param {string} canvasContainerId
     */
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

            // Create temporary container for win lines only
            const winLineGraphics = new PIXI.Graphics();

            this._createGameElements(winLineGraphics); // Pass only winLineGraphics
            this._initCoreModules(winLineGraphics); // Pass only winLineGraphics
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
        await loadButtonAssets(); // Keep this call
    }

    _createLayers() {
        // Assign directly, types allow Container now
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
        this.layerOverlays.sortableChildren = true; // Moved after creation

        this.layerParticles = new PIXI.Container();
        this.layerParticles.name = "Layer: Particles";
        this.layerParticles.zIndex = 60;

        this.layerDebug = new PIXI.Container();
        this.layerDebug.name = "Layer: Debug";
        this.layerDebug.zIndex = 100;
        this.layerDebug.visible = false;

        // Add null checks before adding children
        if (app?.stage && this.layerBackground && this.layerReels && this.layerWinLines && this.layerUI && this.layerLogo && this.layerOverlays && this.layerParticles && this.layerDebug) {
             app.stage.addChild(this.layerBackground, this.layerReels, this.layerWinLines, this.layerUI, this.layerLogo, this.layerOverlays, this.layerParticles, this.layerDebug);
        } else {
            console.error("Game Init Error: One or more layers failed to initialize before adding to stage.");
        }
    }

    _createManagers() {
        // Add null checks for layers passed to managers
        if (!this.layerBackground || !this.layerOverlays || !this.layerReels || !app?.ticker || !this.layerLogo) {
             console.error("Game Init Error: Required layers or ticker not available for manager creation.");
             return;
        }
        // Instantiate managers, passing required layers and dependencies
        this.backgroundManager = new BackgroundManager(this.layerBackground);
        this.freeSpinsUIManager = new FreeSpinsUIManager(this.layerOverlays);
        this.reelManager = new ReelManager(this.layerReels, app.ticker);
        // TODO: Fix SpinManager constructor call if necessary - assuming it takes ReelManager for now
        // If SpinManager needs the Game instance, pass 'this'. Adjust constructor signature if needed.
        this.spinManager = new SpinManager(this.reelManager); // Adjusted call - Verify SpinManager constructor
        new LogoManager(this, this.layerLogo); // Assuming LogoManager needs Game and layerLogo

        // Assign managed sprite if needed, with null check for manager
        this.backgroundSprite = this.backgroundManager ? this.backgroundManager.backgroundSprite : null;

        // Expose managers for debug panel access
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.gameApp.backgroundManager = this.backgroundManager;
            // @ts-ignore
            window.gameApp.freeSpinsUIManager = this.freeSpinsUIManager;
            // @ts-ignore
            window.gameApp.reelManager = this.reelManager;
            // @ts-ignore
            window.gameApp.spinManager = this.spinManager;
        }
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _createGameElements(winLineGraphics) {
        // Reels are created in ReelManager

        // --- Add WinLine Graphics to Layer ---
        if (this.layerWinLines) { // Null check added
            this.layerWinLines.addChild(winLineGraphics);
        }

        // --- Setup UI --- is handled within UIManager ---
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _initCoreModules(winLineGraphics) {
        // Initialize modules that depend on game elements or temporary containers
        // Add null checks for managers and layers before accessing/passing them
        if (!this.reelManager || !this.layerOverlays || !this.layerParticles || !this.layerUI || !this.layerDebug || !app?.ticker) {
             console.error("Game Init Error: Required managers, layers, or ticker not available for core module initialization.");
             return;
        }

        const currentReels = this.reelManager.reels; // Access reels directly after null check
        const reelContainerRef = this.reelManager.reelContainer; // Access container directly after null check

        // TODO: Review initFreeSpins dependencies - does it still need reelContainer?
        // Pass app directly as it's checked above.
        initFreeSpins(app, reelContainerRef, currentReels);
        initPaylineGraphics(winLineGraphics);
        initNotifications(this.layerOverlays); // layerOverlays checked above
        initAnimations(this.layerOverlays, this.layerParticles); // layers checked above
        initTurboMode(currentReels);
        initWinEvaluation(currentReels);

        // --- Initialize UIManager ---
        const uiTextStyle = { fontFamily: "Arial, sans-serif", fontSize: 18, fill: 0xdddddd };
        const uiValueStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } };
        if (this.spinManager) { // Ensure spinManager exists
             initUIManager(this.layerUI, uiTextStyle, uiValueStyle, this.spinManager);
        } else {
             console.error("Game Init Error: SpinManager not available when initializing UIManager.");
             // Handle error: maybe initialize UIManager without spin capabilities or halt?
             // For now, just log the error.
        }

        // --- Initialize Info Overlay (DOM) ---
        infoOverlayElement = document.getElementById('infoOverlay');
        if (infoOverlayElement) {
            initInfoOverlay(infoOverlayElement);
            updateInfoOverlay(); // Initial update
        } else {
            console.warn("Game Setup: infoOverlay element not found in DOM.");
        }

        // --- Initialize Debug Panel ---
        if (this.layerDebug && app) {
             initDebugPanel(app, this.layerDebug);
        }
    }

    _finalizeSetup() {
        // Final stage sort
        if (app?.stage) {
            app.stage.sortChildren();
            console.log("Stage children sorted by zIndex:", app.stage.children.map(c => ({ name: c.name, zIndex: c.zIndex })));
        } else {
            console.error("Finalize Setup Error: Pixi stage not available for sorting.");
        }

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

    // Removed setupUI method

    /**
     * @param {PIXI.Ticker} ticker
     */
    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        try {
            // Update reels via ReelManager - Add null check
            if (this.reelManager) {
                anyReelMoving = this.reelManager.update(delta, now);
            }

            // Update particle animations
            updateParticles(delta);

            // Update Free Spins Indicator via manager - Add null check
            if (this.freeSpinsUIManager) {
                this.freeSpinsUIManager.update();
            }

            // --- Uncommented Spin End Check ---
            // Check if the game was spinning and all reels have now stopped
            if (state.isSpinning && !anyReelMoving && !state.isTransitioning) {
                // Set isTransitioning immediately to prevent duplicate calls or other actions
                updateState({ isTransitioning: true });
                console.log("Game.update: Reels stopped moving. Delaying SpinManager.handleSpinEnd...");

                // Delay the call to handleSpinEnd to allow visual reel stop tweens to finish
                // Use stopTweenDuration from animationSettings plus a small buffer
                // Ensure stopTweenDuration is in milliseconds if imported from settings
                const stopTweenDurationMs = stopTweenDuration; // Assuming it's already in ms
                const evaluationDelay = stopTweenDurationMs + 100; // Buffer (e.g., 100ms)

                setTimeout(() => {
                    // Null check for spinManager
                    if (this.spinManager) {
                        this.spinManager.handleSpinEnd();
                    } else {
                        console.error("Game.update Error: Spin ended but SpinManager is not available.");
                        // Fallback safety: reset state and enable buttons if manager is missing
                        updateState({ isSpinning: false, isTransitioning: false });
                        setButtonsEnabled(true);
                    }
                }, evaluationDelay);
            }

        } catch (err) {
            console.error("Error in game loop:", err);
            if (app?.ticker) {
                app.ticker.stop();
            }
            alert("Game loop critical error. Check console.");
        }
    }

    // Removed handleSpinEnd method - now handled by SpinManager

    /**
     * Generate a random winning pattern
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @returns {{symbol: string, positions: number[]}} A winning pattern with symbol and positions
     */
    generateRandomWinPattern() {
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        const rowIndex = 1;
        const winLength = Math.floor(Math.random() * 3) + 3;
        const positions = [];
        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
          if (i < winLength) {
            positions.push(rowIndex);
          } else {
            positions.push(Math.floor(Math.random() * SETTINGS.SYMBOLS_PER_REEL_VISIBLE));
          }
        }
        return { symbol: winSymbol, positions: positions };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @param {Reel} reel - The reel object
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     */
    findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
        const symbols = reel.strip;
        if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1));

        for (let i = 0; i < symbols.length; i++) {
          if (symbols[i] === targetSymbol) {
            let stopIndex = (i - targetPosition + symbols.length) % symbols.length;
            return stopIndex;
          }
        }
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

    // Removed adjustBackground method - now handled by BackgroundManager
}

// Removed old FS UI functions (createFreeSpinsIndicator, updateFreeSpinsIndicator, startGlowAnimation, stopGlowAnimation)


// --- Global Functions used by other modules ---

// Removed global startSpinLoop function - now handled by SpinManager.startSpin()
