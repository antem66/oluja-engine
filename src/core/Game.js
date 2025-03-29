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
    backgroundManager = null;
    reelManager = null;
    spinManager = null; // Add manager property

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
        // Instantiate managers, passing required layers and dependencies
        this.backgroundManager = new BackgroundManager(this.layerBackground);
        this.freeSpinsUIManager = new FreeSpinsUIManager(this.layerOverlays);
        this.reelManager = new ReelManager(this.layerReels, app.ticker);
        this.spinManager = new SpinManager(this.reelManager, this); // Instantiate SpinManager
        new LogoManager(this, this.layerLogo);

        // Assign managed sprite if needed (though direct use should be minimized)
        this.backgroundSprite = this.backgroundManager.backgroundSprite;

        // Expose managers for debug panel access
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.gameApp.backgroundManager = this.backgroundManager;
            // @ts-ignore
            window.gameApp.freeSpinsUIManager = this.freeSpinsUIManager;
            // @ts-ignore
            window.gameApp.reelManager = this.reelManager;
            // @ts-ignore
            window.gameApp.spinManager = this.spinManager; // Expose SpinManager
        }
    }

    _createGameElements(winLineGraphics) {
        // Reels are created in ReelManager

        // --- Add WinLine Graphics to Layer ---
        if (this.layerWinLines) {
            this.layerWinLines.addChild(winLineGraphics);
        }

        // --- Setup UI --- is handled within UIManager ---
    }

    _initCoreModules(winLineGraphics) {
        // Initialize modules that depend on game elements or temporary containers
        // Pass reels array from ReelManager
        const currentReels = this.reelManager ? this.reelManager.reels : [];
        // Pass reelContainer from ReelManager if needed by FreeSpins logic
        const reelContainerRef = this.reelManager ? this.reelManager.reelContainer : null;
        // TODO: Review initFreeSpins dependencies - does it still need reelContainer?
        initFreeSpins(app, reelContainerRef, currentReels);
        initPaylineGraphics(winLineGraphics);
        initNotifications(this.layerOverlays);
        initAnimations(this.layerOverlays, this.layerParticles);
        initTurboMode(currentReels); // Pass reels from manager
        initWinEvaluation(currentReels); // Pass reels from manager

        // --- Initialize UIManager ---
        // Define styles here or import from config
        const uiTextStyle = { fontFamily: "Arial, sans-serif", fontSize: 18, fill: 0xdddddd };
        const uiValueStyle = { fontFamily: '"Arial Black", Gadget, sans-serif', fontSize: 22, fill: 0xffffff, stroke: { color: 0x000000, width: 2 } };
        initUIManager(this.layerUI, uiTextStyle, uiValueStyle); // Pass layerUI

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

    // Removed setupUI method

    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        try {
            // Update reels via ReelManager
            if (this.reelManager) {
                anyReelMoving = this.reelManager.update(delta, now);
            }

            // Update particle animations
            updateParticles(delta);

            // Update Free Spins Indicator via manager
            if (this.freeSpinsUIManager) {
                this.freeSpinsUIManager.update();
            }

            // --- Temporarily Commented Out Spin End Check for Infinite Spin Test ---
            /*
            if (state.isSpinning && !anyReelMoving && !state.isTransitioning) {
                // Set isTransitioning true immediately to prevent other actions
                updateState({ isTransitioning: true });
                console.log("Game.update: Reels stopped logically. Delaying handleSpinEnd...");

                // Delay the call to handleSpinEnd to allow visual tween to finish
                // Use stopTweenDuration from animationSettings + a larger buffer
                const stopTweenDurationMs = stopTweenDuration; // Already in ms
                const evaluationDelay = stopTweenDurationMs + 300; // Increased buffer to 300ms

                setTimeout(() => {
                    if (this.spinManager) {
                        this.spinManager.handleSpinEnd();
                    } else {
                        console.error("Spin ended but SpinManager is not available.");
                        // Fallback if manager is missing after delay
                        updateState({ isSpinning: false, isTransitioning: false });
                        setButtonsEnabled(true);
                    }
                }, evaluationDelay);
            }
            */

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
